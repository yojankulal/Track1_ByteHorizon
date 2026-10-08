import argparse
import pandas as pd
import osmnx as ox
import networkx as nx
import os

def build_road_graph(sectors_path):
    print(f"Loading sectors from {sectors_path}")
    try:
        df = pd.read_parquet(sectors_path)
    except Exception as e:
        print(f"Error reading {sectors_path}: {e}")
        return

    if 'lat' not in df.columns or 'lon' not in df.columns:
        print("Sectors file missing 'lat' or 'lon' columns")
        return

    # Get bounding box of sectors
    south, north = df['lat'].min(), df['lat'].max()
    west, east = df['lon'].min(), df['lon'].max()
    
    print(f"Bounding box: West:{west} South:{south} East:{east} North:{north}")
    
    # Download graph
    # In OSMnx 2.1.1, bbox is a tuple: (left, bottom, right, top) which corresponds to (west, south, east, north)
    bbox = (west, south, east, north)
    
    print(f"Downloading drive network for the bounding box...")
    try:
        G = ox.graph_from_bbox(bbox=bbox, network_type='drive', simplify=True)
        print(f"Downloaded graph with {len(G.nodes)} nodes and {len(G.edges)} edges.")
        
        # Save graph
        out_dir = os.path.dirname(sectors_path)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, 'road_graph.graphml')
        ox.save_graphml(G, out_path)
        print(f"Saved graph to {out_path}")
    except Exception as e:
        print(f"Error downloading or saving graph: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Build a road network graph from OSM over the bounding box of sectors.")
    parser.add_argument('--sectors', type=str, required=True, help="Path to sectors parquet file")
    args = parser.parse_args()
    
    build_road_graph(args.sectors)
