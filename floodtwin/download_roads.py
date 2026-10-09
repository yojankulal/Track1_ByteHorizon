import sys
sys.path.insert(0, '.')
from backend.app.api.infrastructure import _download_osm_roads
print('Starting OSM download...')
result = _download_osm_roads()
n = len(result['features'])
print(f'Done! Downloaded {n} road segments.')
