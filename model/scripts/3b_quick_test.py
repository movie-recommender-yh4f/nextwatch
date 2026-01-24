"""Quick test of recommendations for key movies"""
import pandas as pd

# Load data
print("Loading data...")
sim_df = pd.read_csv('../data/processed/similarity_matrix.csv')
movies_meta = pd.read_csv('../data/processed/movies_normalized.csv')

# Rename columns
if 'movie_id' in movies_meta.columns:
  movies_meta = movies_meta.rename(columns={'movie_id': 'id'})

# Test cases
test_cases = [
  (19995, "Avatar"),
  (238, "The Godfather"),
  (27205, "Inception"),
  (157336, "Interstellar"),
  (24428, "The Avengers"),
  (75006, "The Umbrella Academy"),
  (1399, "Game of Thrones")
]

for movie_id, movie_name in test_cases:
  print("\n" + "=" * 80)
  print(f"TOP 10 RECOMMENDATIONS FOR: {movie_name}")
  print("=" * 80)
  
  # Get similarities
  sims = sim_df[sim_df['id'] == movie_id].head(10)
  
  # Merge with metadata
  result = sims.merge(
    movies_meta[['id', 'title', 'vote_average', 'budget', 'revenue']], 
    left_on='similar_id', 
    right_on='id', 
    suffixes=('', '_meta')
  )
  
  # Display
  for i, row in result.iterrows():
    budget_str = f"${row['budget']/1e6:.0f}M" if row['budget'] > 0 else "N/A"
    revenue_str = f"${row['revenue']/1e6:.0f}M" if row['revenue'] > 0 else "N/A"
    print(f"{i+1:2d}. {row['title'][:50]:50s} | Rating: {row['vote_average']:.1f} | Budget: {budget_str:8s} | Similarity: {row['similarity_score']:.3f}")

print("\n" + "=" * 80)
print("DONE!")
