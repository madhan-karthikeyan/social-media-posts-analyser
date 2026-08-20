import re
import json
import httpx
import socket
import ipaddress
from bs4 import BeautifulSoup
from typing import Tuple, Optional, Dict, Any, List
from urllib.parse import urlparse, urlunparse, urljoin

from models import ScrapingError

# Improved URL patterns
URL_PATTERNS = {
    "linkedin": r"^https?:\/\/(www\.)?(linkedin\.com\/(posts|feed\/update|pulse)\/[a-zA-Z0-9_-]+|lnkd\.in\/[a-zA-Z0-9_/-]+)",
    "instagram": r"^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+",
    "x": r"^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/status\/[0-9]+"
}

def normalize_url(url: str) -> str:
    parsed = urlparse(url)
    # Remove fragments and tracking params
    clean_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, '', ''))
    return clean_url

def detect_platform(url: str) -> Optional[str]:
    if "instagram.com/reel/" in url.lower() or "instagram.com/tv/" in url.lower():
        raise ScrapingError("UNSUPPORTED_MEDIA", "Instagram Reels and videos are not supported. Only image posts are supported.")
        
    for platform, pattern in URL_PATTERNS.items():
        if re.search(pattern, url, re.IGNORECASE):
            return platform
    return None

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_multicast:
            return False
        return True
    except Exception:
        return False

async def safe_get(client: httpx.AsyncClient, url: str, headers: dict, max_size: int = 20 * 1024 * 1024) -> httpx.Response:
    current_url = url
    for _ in range(4): # up to 3 redirects
        if not is_safe_url(current_url):
            raise ScrapingError("SSRF_BLOCKED", "URL resolved to a blocked internal network address.")
            
        request = client.build_request("GET", current_url, headers=headers)
        response = await client.send(request, stream=True)
        
        if response.is_redirect:
            location = response.headers.get("location")
            await response.aclose()
            if not location:
                break
            current_url = urljoin(current_url, location)
        else:
            content = bytearray()
            async for chunk in response.aiter_bytes():
                content.extend(chunk)
                if len(content) > max_size:
                    await response.aclose()
                    raise ScrapingError("FILE_TOO_LARGE", f"Response exceeded {max_size} bytes limit.")
            await response.aclose()
            
            return httpx.Response(
                status_code=response.status_code,
                headers=response.headers,
                content=bytes(content),
                request=request
            )
            
    raise httpx.RequestError("Too many redirects")

def extract_json_ld(soup: BeautifulSoup) -> List[Dict]:
    json_lds = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            if isinstance(data, list):
                json_lds.extend(data)
            else:
                json_lds.append(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return json_lds

def extract_author(soup: BeautifulSoup, json_lds: List[Dict]) -> Optional[str]:
    # 1. JSON-LD
    for ld in json_lds:
        if "author" in ld:
            author = ld["author"]
            if isinstance(author, dict) and "name" in author:
                return author["name"]
            elif isinstance(author, str):
                return author

    # 2. OpenGraph
    og_title = (
        soup.find("meta", property="og:title") or
        soup.find("meta", attrs={"name": "twitter:title"})
    )
    if og_title and "content" in og_title.attrs:
        title_content = og_title["content"].strip()
        # Clean LinkedIn's "John Doe on LinkedIn: ..."
        if " on LinkedIn:" in title_content:
            return title_content.split(" on LinkedIn:")[0]
        # X / Twitter titles are often "Name on X: ..."
        if " on X:" in title_content:
            return title_content.split(" on X:")[0]
        return title_content
    return None

def extract_caption(soup: BeautifulSoup, json_lds: List[Dict]) -> Optional[str]:
    # 1. JSON-LD
    for ld in json_lds:
        if "description" in ld:
            return ld["description"]
        if "articleBody" in ld:
            return ld["articleBody"]

    # 2. Meta tags
    desc_tag = (
        soup.find("meta", property="og:description") or
        soup.find("meta", attrs={"name": "twitter:description"}) or
        soup.find("meta", attrs={"name": "description"})
    )
    if desc_tag and "content" in desc_tag.attrs:
        return desc_tag["content"].strip()

    return None

def extract_image_url(soup: BeautifulSoup, json_lds: List[Dict]) -> Optional[str]:
    # 1. JSON-LD
    for ld in json_lds:
        if "image" in ld:
            img = ld["image"]
            if isinstance(img, dict) and "url" in img:
                return img["url"]
            elif isinstance(img, list) and len(img) > 0:
                if isinstance(img[0], dict) and "url" in img[0]:
                    return img[0]["url"]
                elif isinstance(img[0], str):
                    return img[0]
            elif isinstance(img, str):
                return img

    # 2. OpenGraph / Twitter Cards
    img_tag = (
        soup.find("meta", property="og:image:secure_url") or
        soup.find("meta", property="og:image") or
        soup.find("meta", attrs={"name": "twitter:image:src"}) or
        soup.find("meta", attrs={"name": "twitter:image"})
    )
    if img_tag and "content" in img_tag.attrs:
        return img_tag["content"].strip()

    return None

async def fetch_post_metadata_and_image(raw_url: str) -> Tuple[str, Dict[str, Any], Optional[bytes], str, List[str]]:
    """
    Fetches public HTML metadata (OpenGraph tags, JSON-LD) for a social post URL.
    Returns: (platform, public_context_dict, image_bytes_or_none, image_content_type, warnings_list)
    """
    url = normalize_url(raw_url)
    platform = detect_platform(url)
    if not platform:
        raise ScrapingError("UNSUPPORTED_PLATFORM", "Unsupported or invalid social media post URL. Only LinkedIn, Instagram, and X (Twitter) public post URLs are supported.")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    warnings = []
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await safe_get(client, url, headers)
            
            # Detect login redirects (e.g. Instagram /accounts/login/)
            if "accounts/login" in str(response.url) or "login" in str(response.url):
                raise ScrapingError("LOGIN_REQUIRED", f"Private or login-required post on {platform.capitalize()}. Platform requires login to view this content. Please screenshot the post and drag & drop the image instead!", platform)

            if response.status_code == 404:
                raise ScrapingError("POST_NOT_FOUND", "Post not found. Make sure the post exists and is public.", platform)
            elif response.status_code == 429:
                raise ScrapingError("RATE_LIMITED", f"Rate limited by {platform.capitalize()}. Please try again later or screenshot the post.", platform)
            elif response.status_code in (401, 403):
                raise ScrapingError("ACCESS_DENIED", f"Access denied or login required by {platform.capitalize()}. Please screenshot the post and drag & drop the image instead!", platform)
            elif response.status_code != 200:
                raise ScrapingError("NETWORK_ERROR", f"Failed to retrieve post from {platform.capitalize()}. HTTP Status: {response.status_code}", platform)

            soup = BeautifulSoup(response.text, "html.parser")
            json_lds = extract_json_ld(soup)

            author = extract_author(soup, json_lds)
            caption = extract_caption(soup, json_lds)
            image_url = extract_image_url(soup, json_lds)

            public_context = {
                "authorLabel": author,
                "caption": caption,
                "altText": None
            }

            if not image_url and not caption:
                raise ScrapingError("NO_PUBLIC_METADATA", f"Could not retrieve any public metadata or media for this {platform.capitalize()} link. This usually means the post is private or strongly bot-protected. Please take a screenshot of the post and drag & drop the image directly!", platform)

            image_bytes = None
            content_type = "image/jpeg"

            if image_url:
                try:
                    img_res = await safe_get(client, image_url, headers)
                    if img_res.status_code == 200:
                        ct = img_res.headers.get("content-type", "").lower()
                        if ct.startswith("image/"):
                            image_bytes = img_res.content
                            content_type = ct.split(";")[0]
                        else:
                            warnings.append(f"Image URL returned non-image content type: {ct}")
                    else:
                        warnings.append(f"Failed to download image from {image_url}. Status: {img_res.status_code}")
                except httpx.RequestError as e:
                    warnings.append(f"Network error while downloading image: {e}")

            if not image_bytes:
                warnings.append("Public post metadata was extracted, but no downloadable image was found.")

            return platform, public_context, image_bytes, content_type, warnings

        except httpx.RequestError as e:
            err_msg = str(e).lower()
            if "decompressing" in err_msg or "zlib" in err_msg or "header check" in err_msg:
                raise ScrapingError(
                    "NO_PUBLIC_METADATA", 
                    f"The platform blocked our automated request (anti-bot protection). Please take a screenshot of the post and drag & drop the image instead!", 
                    platform
                )
            raise ScrapingError("NETWORK_ERROR", f"Could not connect to the post URL: {e}", platform)
