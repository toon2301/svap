#!/usr/bin/env python
"""
Redis setup script pre testovanie
"""
import os
import redis
from django.core.cache import cache

def test_redis_connection():
    """Test Redis pripojenia"""
    try:
        # Test priameho pripojenia
        r = redis.Redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'))
        r.ping()
        print("✅ Redis pripojenie funguje")
        
        # Test Django cache
        cache.set('test_key', 'test_value', 30)
        value = cache.get('test_key')
        if value == 'test_value':
            print("✅ Django cache s Redis funguje")
            cache.delete('test_key')
        else:
            print("❌ Django cache s Redis nefunguje")
            
    except Exception as e:
        print(f"❌ Redis chyba: {e}")
        print("💡 Spusti Redis server alebo nastav REDIS_URL")

if __name__ == "__main__":
    test_redis_connection()
