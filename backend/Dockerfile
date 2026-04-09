# ใช้ Python เวอร์ชันเบาเพื่อลดขนาด Image
FROM python:3.10-slim

# ตั้งค่า Directory ใน Container
WORKDIR /app

# ก๊อปปี้ไฟล์ requirements และติดตั้ง Library
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ⚠️ ทริคระดับ Pro: สั่งให้โหลด Embedding Model เก็บไว้ใน Image เลย 
# เพื่อแก้ปัญหา Cold Start (เปิดแอปล่าช้า) บน Cloud Run
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# ก๊อปปี้ไฟล์ทั้งหมดในโฟลเดอร์โปรเจกต์ลง Container
COPY . .

# เปิดพอร์ต 8000
EXPOSE 8000

# คำสั่งรัน FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]