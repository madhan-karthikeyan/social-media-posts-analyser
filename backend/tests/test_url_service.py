import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from models import ScrapingError
from services.url_service import (
    normalize_url,
    detect_platform,
    extract_author,
    extract_caption,
    extract_image_url,
    fetch_post_metadata_and_image
)
from bs4 import BeautifulSoup

def test_normalize_url():
    assert normalize_url("https://x.com/user/status/1234?s=20") == "https://x.com/user/status/1234"
    assert normalize_url("https://www.linkedin.com/posts/xyz_123/?utm_source=share") == "https://www.linkedin.com/posts/xyz_123/"

def test_detect_platform():
    assert detect_platform("https://www.linkedin.com/posts/john-doe_ai-trends-activity-12345") == "linkedin"
    assert detect_platform("https://linkedin.com/feed/update/urn:li:activity:1234") == "linkedin"
    assert detect_platform("https://www.instagram.com/p/Cxyz123/") == "instagram"
    
    with pytest.raises(ScrapingError) as exc:
        detect_platform("https://instagram.com/reel/Cxyz123/")
    assert exc.value.code == "UNSUPPORTED_MEDIA"
    
    assert detect_platform("https://x.com/elonmusk/status/123456789") == "x"
    assert detect_platform("https://twitter.com/elonmusk/status/123456789") == "x"
    assert detect_platform("https://google.com") is None

def test_extract_author():
    html = '<meta property="og:title" content="John Doe on LinkedIn: Hello world">'
    soup = BeautifulSoup(html, "html.parser")
    assert extract_author(soup, []) == "John Doe"

    html2 = '<meta name="twitter:title" content="Jane on X: Great day">'
    soup2 = BeautifulSoup(html2, "html.parser")
    assert extract_author(soup2, []) == "Jane"

    json_ld = [{"author": {"name": "Alice"}}]
    assert extract_author(BeautifulSoup("", "html.parser"), json_ld) == "Alice"

def test_extract_caption():
    html = '<meta name="twitter:description" content="This is a test tweet.">'
    soup = BeautifulSoup(html, "html.parser")
    assert extract_caption(soup, []) == "This is a test tweet."

def test_extract_image_url():
    html = '<meta property="og:image:secure_url" content="https://example.com/img.jpg">'
    soup = BeautifulSoup(html, "html.parser")
    assert extract_image_url(soup, []) == "https://example.com/img.jpg"

@pytest.mark.asyncio
@pytest.mark.asyncio
@patch("httpx.AsyncClient.send")
async def test_fetch_post_metadata_success(mock_send):
    # Mock HTML response
    mock_html_response = MagicMock()
    mock_html_response.status_code = 200
    mock_html_response.is_redirect = False
    mock_html_response.url = "https://x.com/test/status/123"
    mock_html_response.text = '''
        <html>
            <meta name="twitter:title" content="Test User on X: Hello">
            <meta name="twitter:description" content="Test caption">
            <meta name="twitter:image" content="https://example.com/img.png">
        </html>
    '''
    
    async def aiter_html():
        yield mock_html_response.text.encode('utf-8')
    mock_html_response.aiter_bytes = aiter_html
    mock_html_response.aclose = AsyncMock()

    # Mock Image response
    mock_img_response = MagicMock()
    mock_img_response.status_code = 200
    mock_img_response.is_redirect = False
    mock_img_response.headers = {"content-type": "image/png"}
    mock_img_response.content = b"fake_image_bytes"
    
    async def aiter_img():
        yield b"fake_image_bytes"
    mock_img_response.aiter_bytes = aiter_img
    mock_img_response.aclose = AsyncMock()

    # Set side effect to return HTML first, then Image
    mock_send.side_effect = [mock_html_response, mock_img_response]

    platform, context, img_bytes, content_type, warnings = await fetch_post_metadata_and_image("https://x.com/test/status/123")

    assert platform == "x"
    assert context["authorLabel"] == "Test User"
    assert context["caption"] == "Test caption"
    assert img_bytes == b"fake_image_bytes"
    assert content_type == "image/png"
    assert len(warnings) == 0

@pytest.mark.asyncio
@patch("httpx.AsyncClient.send")
async def test_fetch_post_metadata_login_wall(mock_send):
    mock_redirect = MagicMock()
    mock_redirect.status_code = 302
    mock_redirect.is_redirect = True
    mock_redirect.headers = {"location": "https://www.instagram.com/accounts/login/"}
    mock_redirect.aclose = AsyncMock()

    mock_login = MagicMock()
    mock_login.status_code = 200
    mock_login.is_redirect = False
    mock_login.url = "https://www.instagram.com/accounts/login/" 
    mock_login.aclose = AsyncMock()
    
    async def aiter_html():
        yield b"login"
    mock_login.aiter_bytes = aiter_html
    
    mock_send.side_effect = [mock_redirect, mock_login]

    with pytest.raises(ScrapingError) as exc_info:
        await fetch_post_metadata_and_image("https://www.instagram.com/p/123/")

    assert exc_info.value.code == "LOGIN_REQUIRED"

@pytest.mark.asyncio
@patch("httpx.AsyncClient.send")
async def test_fetch_post_partial_results(mock_send):
    mock_html_response = MagicMock()
    mock_html_response.status_code = 200
    mock_html_response.is_redirect = False
    mock_html_response.url = "https://x.com/test/status/123"
    mock_html_response.text = '''
        <html>
            <meta name="twitter:title" content="Test User on X: Hello">
            <meta name="twitter:description" content="Test caption text only">
            <meta name="twitter:image" content="https://example.com/img.png">
        </html>
    '''
    
    async def aiter_html():
        yield mock_html_response.text.encode('utf-8')
    mock_html_response.aiter_bytes = aiter_html
    mock_html_response.aclose = AsyncMock()

    # Mock Image response returning 404
    mock_img_response = MagicMock()
    mock_img_response.status_code = 404
    mock_img_response.is_redirect = False
    mock_img_response.aclose = AsyncMock()
    
    async def aiter_img():
        yield b""
    mock_img_response.aiter_bytes = aiter_img

    mock_send.side_effect = [mock_html_response, mock_img_response]

    platform, context, img_bytes, content_type, warnings = await fetch_post_metadata_and_image("https://x.com/test/status/123")

    assert platform == "x"
    assert context["caption"] == "Test caption text only"
    assert img_bytes is None
    assert len(warnings) > 0
    assert "Failed to download image" in warnings[0]
