#!/usr/bin/env bash
# 에러 발생 시 즉시 중단
set -o errexit

# 1. 패키지 설치
pip install -r requirements.txt

# 1-1. 프론트엔드 빌드
echo "Building Frontend..."
cd ../frontend
npm install
CI=false npm run build
cd ../backend

# 2. 정적 파일 모으기 (CSS 등)
python manage.py collectstatic --no-input

# 3. DB 마이그레이션
python manage.py migrate

# 4. [추가] 데이터 넣기 (이 줄을 추가하세요!)
# 데이터가 이미 있으면 덮어쓰기(Update) 되므로 안전합니다.
#python manage.py loaddata data.json