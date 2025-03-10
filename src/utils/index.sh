docker run -d -p 8099:6379 --name miniRunRedis \
  -v /var/www/redis/data:/data \
  redis redis-server --requirepass miniRun317 --appendonly yes
# 101.126.18.51 公网IP connect redis 101.126.18.51:8099