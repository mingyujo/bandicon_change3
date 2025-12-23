import os
import django

# 1. Django 설정 로드 (가장 먼저 실행)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# 2. Django가 초기화된 후 관련 모듈 임포트 (순서 중요!)
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import clan_app.routing  # 우리가 만든 라우팅 파일

# 3. HTTP 핸들러 미리 가져오기
django_asgi_app = get_asgi_application()

# 4. 라우터 설정
application = ProtocolTypeRouter({
    # http 요청 -> Django가 처리
    "http": django_asgi_app,

    # websocket 요청 -> Channels가 처리
    "websocket": AuthMiddlewareStack(
        URLRouter(
            clan_app.routing.websocket_urlpatterns
        )
    ),
})