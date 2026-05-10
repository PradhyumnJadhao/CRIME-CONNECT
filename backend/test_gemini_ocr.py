# Save as test_gemini_ocr.py in backend/
import os
os.environ["GEMINI_API_KEY"] = "AIzaSyBAIyNKfmldBUejROYp7O9KgnEOs_O89Is"
os.environ["GEMINI_MODEL"] = "gemini-2.5-flash-preview-04-17"

from app.services.ocr_service import extract_text

# Test 1: TXT file
with open("test_sample.txt", "w") as f:
    f.write("FIR No. 123/2024\nSuspect: Ramesh Kumar\nWeapon: Knife")

try:
    result = extract_text("test_sample.txt")
    print("TXT TEST:", result)
    assert "Ramesh Kumar" in result, "TXT extraction failed"
    print("✅ TXT Test Passed")
except Exception as e:
    print(f"❌ TXT Test Failed: {e}")

# Test 2: PDF file (check if sample_fir.pdf exists, else skip or create a dummy if possible)
if os.path.exists("sample_fir.pdf"):
    try:
        result2 = extract_text("sample_fir.pdf")
        print(f"PDF TEST: {len(result2)} characters extracted")
        assert len(result2) > 50, "PDF extraction returned too little text"
        print("✅ PDF Test Passed")
    except Exception as e:
        print(f"❌ PDF Test Failed: {e}")
else:
    print("⚠️ Skipping PDF TEST: sample_fir.pdf not found in backend/")

print("\n✅ OCR tests completed. Check results above.")
