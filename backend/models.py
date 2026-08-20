from pydantic import BaseModel
from typing import List, Optional

class ScrapingError(Exception):
    def __init__(self, code: str, message: str, platform: Optional[str] = None):
        self.code = code
        self.message = message
        self.platform = platform
        super().__init__(self.message)

class AnalysisUrlRequest(BaseModel):
    url: str

class AnalysisAccessibility(BaseModel):
    alt_text: str
    readability: str
    contrast_observation: str
    text_density_observation: str

class AnalysisReport(BaseModel):
    summary: str
    visual_strengths: List[str]
    improvement_opportunities: List[str]
    accessibility: AnalysisAccessibility
    caption_recommendation: str
    call_to_action: str
    confidence: str
    limitations: List[str]

class ImageMetadata(BaseModel):
    contentType: str
    bytes: int

class PublicContext(BaseModel):
    authorLabel: Optional[str] = None
    caption: Optional[str] = None
    altText: Optional[str] = None

class AnalysisData(BaseModel):
    sourceType: str
    platform: Optional[str] = "file"
    canonicalPostUrl: Optional[str] = ""
    mediaType: str
    image: Optional[ImageMetadata] = None
    publicContext: PublicContext
    analysis: AnalysisReport
    warnings: List[str] = []

class SuccessResponse(BaseModel):
    ok: bool = True
    requestId: str
    data: AnalysisData

class ErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool

class ErrorResponse(BaseModel):
    ok: bool = False
    requestId: str
    error: ErrorDetail
