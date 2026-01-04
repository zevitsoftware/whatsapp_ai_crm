import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from paddleocr import PaddleOCR
import logging
import traceback

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ocr-service")

app = FastAPI(
    title="PaddleOCR Service",
    description="Microservice for extracting text from images and PDFs using PaddleOCR",
    version="1.0.0"
)

# Initialize PaddleOCR with standard stable settings
ocr = PaddleOCR(use_angle_cls=True, lang='id')

class ScanRequest(BaseModel):
    filePath: str

@app.get("/")
async def root():
    return {"message": "PaddleOCR Service is running"}

def extract_text_from_result(result, file_path=""):
    """
    Universal text extractor that handles both Image and PDF results
    """
    extracted_text = ""
    
    if not result or len(result) == 0:
        return extracted_text
    
    # Debug: Log the structure
    logger.info(f"OCR Result type: {type(result)}, Length: {len(result) if hasattr(result, '__len__') else 'N/A'}")
    if result and len(result) > 0:
        logger.info(f"First item type: {type(result[0])}")
        if isinstance(result[0], dict):
            logger.info(f"First item keys: {result[0].keys()}")
    
    # Determine file type
    is_pdf = file_path.lower().endswith('.pdf')
    
    for page_idx, page in enumerate(result):
        if page is None or len(page) == 0:
            continue
        
        # Handle dictionary format (newer PaddleOCR versions)
        if isinstance(page, dict):
            if 'rec_texts' in page:
                texts = page['rec_texts']
                extracted_text += "\n".join(texts) + "\n\n"
                continue
        
        # Handle list format
        if isinstance(page, list):
            # Check if it's a list of detections [bbox, (text, conf)]
            if len(page) > 0 and isinstance(page[0], list) and len(page[0]) >= 2:
                # Try layout-aware extraction for images
                if not is_pdf:
                    try:
                        sorted_boxes = sorted(page, key=lambda x: (x[0][0][1], x[0][0][0]))
                        lines, current_line, last_y = [], [], None
                        
                        for box_data in sorted_boxes:
                            bbox = box_data[0]
                            text_info = box_data[1]
                            text = text_info[0] if isinstance(text_info, (tuple, list)) else str(text_info)
                            center_y = (bbox[0][1] + bbox[2][1]) / 2
                            
                            if last_y is None or abs(center_y - last_y) < 15:
                                current_line.append(text)
                            else:
                                if current_line:
                                    lines.append(" ".join(current_line))
                                current_line = [text]
                            last_y = center_y
                        
                        if current_line:
                            lines.append(" ".join(current_line))
                        
                        extracted_text += "\n".join(lines) + "\n\n"
                        continue
                    except (IndexError, TypeError, KeyError, AttributeError) as e:
                        logger.warning(f"Layout extraction failed, using fallback: {e}")
                
                # Fallback: Simple text extraction
                texts = []
                for item in page:
                    if isinstance(item, list) and len(item) > 1:
                        text_detail = item[1]
                        if isinstance(text_detail, (tuple, list)):
                            texts.append(str(text_detail[0]))
                        else:
                            texts.append(str(text_detail))
                
                extracted_text += "\n".join(texts) + "\n\n"
    
    return extracted_text.strip()

@app.post("/scan", summary="Scan an image from a local file path")
async def scan_file_path(request: ScanRequest): 
    """
    Reads an image from the shared volume path and returns the extracted text.
    """
    if not os.path.exists(request.filePath):
        logger.error(f"File not found: {request.filePath}")
        raise HTTPException(status_code=404, detail=f"File not found at {request.filePath}")

    try:
        logger.info(f"Scanning file: {request.filePath}")
        result = ocr.ocr(request.filePath)
        extracted_text = extract_text_from_result(result, request.filePath)
        
        return {
            "success": True,
            "text": extracted_text
        }
    except Exception as e:
        logger.error(f"OCR Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload", summary="Upload an image directly to scan (Testing only)")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image file directly to the service and SAVE it to the shared volume.
    Useful for testing the /scan endpoint later.
    """
    file_path = f"/app/shared_media/{file.filename}"
    
    # Save to shared volume
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        result = ocr.ocr(file_path)
        extracted_text = extract_text_from_result(result, file_path)
        
        return {
            "success": True,
            "text": extracted_text,
            "filename": file.filename,
            "internalPath": file_path,
            "note": "File saved to shared_media persistently for testing /scan"
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
