# Similarity Search Algorithm - Documentation

This document explains how the similarity score is computed for mentor-student matching and describes the logic and flow of the Python matching script.

---

## Overview

The similarity search algorithm computes a **combined similarity score** between mentors and students using two components:

1. **Profile Data Similarity** (70% weight)
   - Based on: skills, major, projects, relevant_coursework, experiences, achievements, aspirations
   - Method: TF-IDF vectorization + Cosine similarity

2. **Location Similarity** (30% weight)
   - Based on: geographic location matching
   - Method: Normalized string matching with exact/partial matching

**Final Score Range**: 0.0 to 1.0
- **1.0** = Perfect match (identical profiles + same location)
- **0.0** = No similarity

---

## Similarity Score Computation

### Formula

```
Final Similarity Score = (0.7 × Profile Similarity) + (0.3 × Location Similarity)
```

### Component 1: Profile Similarity (70%)

#### Step 1: Text Extraction
Extracts and combines text from the following profile fields:
- `skills` (array) → joined into text
- `major` (string) → for students
- `projects` (array of objects) → all text values extracted
- `relevant_coursework` (array) → joined into text
- `experiences` (array of objects) → all text values extracted
- `achievements` (array) → joined into text
- `aspirations` (string)
- `parsed_resume` (JSON object) → all text fields extracted recursively

**Example**:
```python
Profile → "Python JavaScript Computer Science Web Development React Machine Learning Data Structures Algorithms"
```

#### Step 2: TF-IDF Vectorization
Converts text strings into numerical vectors:
- **TF (Term Frequency)**: How often each word appears in the profile
- **IDF (Inverse Document Frequency)**: How rare/common each word is across all profiles
- Creates vectors of up to 5000 features (terms)
- Uses unigrams (single words) and bigrams (2-word phrases)
- Removes English stop words

**Configuration**:
- `max_features=5000` - Limit vocabulary size
- `ngram_range=(1,2)` - Single words + 2-word phrases
- `stop_words='english'` - Remove common words
- `lowercase=True` - Case-insensitive

#### Step 3: Cosine Similarity
Computes the angle between mentor and student vectors:

```
cosine_similarity = dot_product(mentor_vector, student_vector) / 
                    (||mentor_vector|| × ||student_vector||)
```

**Result**: Value between 0.0 (no similarity) and 1.0 (identical)

### Component 2: Location Similarity (30%)

#### Step 1: Location Normalization
Normalizes location strings for comparison:
- Converts to lowercase
- Removes punctuation (commas, periods, semicolons)
- Expands state abbreviations (e.g., "NY" → "new york", "CA" → "california")
- Removes extra whitespace

**Examples**:
- "New York, NY" → "new york new york"
- "San Francisco, CA" → "san francisco california"
- "Chicago, Illinois" → "chicago illinois"

#### Step 2: Location Matching
Three levels of matching:

1. **Exact Match** (Score: 1.0)
   - Normalized locations are identical
   - Example: "New York, NY" matches "New York City" (after normalization)

2. **Partial Match** (Score: 0.0 - 0.5)
   - Locations share common words (city, state, or country)
   - Uses Jaccard similarity: `common_words / total_unique_words`
   - Scaled to maximum 0.5
   - Example: "New York City" vs "New York, NY" → shares "new" and "york"

3. **No Match** (Score: 0.0)
   - No common words or both locations are empty

---

## Python Script Logic & Flow

### Script Structure

The matching script (`matching/mentor_mentee_matcher.py`) contains the following main functions:

1. `extract_text_from_profile()` - Extracts text from profile fields
2. `vectorize_profiles()` - Converts text to TF-IDF vectors
3. `normalize_location()` - Normalizes location strings
4. `compute_location_similarity()` - Computes location similarity matrix
5. `compute_similarity_scores()` - Combines profile and location similarities
6. `match_mentees_to_mentors()` - Greedy matching algorithm
7. `perform_matching()` - Main orchestration function

### Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: INPUT VALIDATION                                     │
│ - Read JSON input (mentors + mentees)                        │
│ - Filter mentors (only willing_to_be_mentor = true)          │
│ - Check for empty lists                                      │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 2: TEXT EXTRACTION                                      │
│ For each profile:                                            │
│   - Extract skills, major, projects, coursework              │
│   - Extract experiences, achievements, aspirations           │
│   - Extract parsed_resume (recursively)                      │
│   - Combine into single text string                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 3: TF-IDF VECTORIZATION                                 │
│ - Vectorize all profiles together (mentors + mentees)        │
│ - Build vocabulary from all texts                            │
│ - Create feature vectors (max 5000 features)                 │
│ - Split back into mentor and mentee vectors                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 4: PROFILE SIMILARITY                                   │
│ - Compute cosine similarity matrix                           │
│   similarity_matrix[i,j] = similarity(mentee_i, mentor_j)   │
│ - Shape: (n_mentees × n_mentors)                             │
│ - Handle NaN values (replace with 0.0)                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 5: LOCATION EXTRACTION                                  │
│ - Extract location field from each profile                   │
│ - Create lists: mentor_locations, mentee_locations           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 6: LOCATION NORMALIZATION                               │
│ For each location:                                           │
│   - Normalize (lowercase, remove punctuation)                │
│   - Expand state abbreviations                               │
│   - Clean whitespace                                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 7: LOCATION SIMILARITY                                  │
│ For each mentor-mentee location pair:                        │
│   - Check exact match → 1.0                                  │
│   - Check partial match → Jaccard × 0.5                      │
│   - No match → 0.0                                           │
│ - Create location similarity matrix                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 8: COMBINE SIMILARITIES                                 │
│ - Normalize weights to sum to 1.0                            │
│ - Combine:                                                   │
│   final_score = 0.7 × profile_sim + 0.3 × location_sim      │
│ - Result: Combined similarity matrix                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 9: GREEDY MATCHING                                      │
│ - Create list of all (mentee, mentor, score) pairs           │
│ - Sort by similarity score (descending)                      │
│ - For each pair (highest to lowest):                         │
│   - If mentor has capacity AND mentee not assigned:          │
│     * Assign mentee to mentor                                │
│     * Decrement mentor capacity                              │
│ - Continue until all pairs processed                         │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ STEP 10: OUTPUT GENERATION                                   │
│ - Format results with mentor info                            │
│ - Include assigned mentees with similarity scores            │
│ - Calculate statistics (total assigned, utilization rate)    │
│ - Return JSON result                                         │
└──────────────────────────────────────────────────────────────┘
```

### Detailed Function Descriptions

#### 1. `extract_text_from_profile(profile)`

**Purpose**: Combines all textual profile data into a single string

**Process**:
- Checks each field type (array, object, string)
- Extracts and joins text values
- Handles nested structures (parsed_resume) recursively
- Removes extra whitespace

**Returns**: Single combined text string

**Example Input**:
```python
{
    'skills': ['Python', 'JavaScript'],
    'major': 'Computer Science',
    'projects': [{'name': 'Web App', 'tech': 'React'}]
}
```

**Example Output**:
```
"Python JavaScript Computer Science Web App React"
```

#### 2. `vectorize_profiles(profiles)`

**Purpose**: Converts text strings into numerical TF-IDF vectors

**Process**:
- Extracts text from all profiles
- Creates TF-IDF vectorizer with configuration
- Fits vectorizer on all texts (builds vocabulary)
- Transforms texts to vectors
- Handles edge cases (empty texts, all zeros)

**Returns**: Tuple of (vector_matrix, vectorizer)
- `vector_matrix`: NumPy array shape (n_profiles, n_features)
- `vectorizer`: Fitted TF-IDF vectorizer

**Key Configuration**:
- Max 5000 features (terms)
- Unigrams + bigrams
- English stop words removed

#### 3. `normalize_location(location)`

**Purpose**: Normalizes location strings for consistent comparison

**Process**:
- Converts to lowercase
- Removes punctuation
- Expands US state abbreviations (50 states supported)
- Removes extra whitespace

**Returns**: Normalized location string

**Example**:
```python
normalize_location("New York, NY")  
# → "new york new york"

normalize_location("San Francisco, California")
# → "san francisco california"
```

#### 4. `compute_location_similarity(mentor_locations, mentee_locations)`

**Purpose**: Computes similarity matrix based on location matching

**Process**:
For each mentor-mentee location pair:
1. Normalize both locations
2. Check for exact match → return 1.0
3. Extract words from both locations
4. Find common words (excluding stop words)
5. Calculate Jaccard similarity
6. Scale to 0.5 maximum for partial matches

**Returns**: NumPy array shape (n_mentees, n_mentors) with location similarity scores

**Matching Logic**:
- Exact match after normalization → 1.0
- Shared words → Jaccard × 0.5 (max 0.5)
- No match → 0.0

#### 5. `compute_similarity_scores(...)`

**Purpose**: Combines profile and location similarities into final scores

**Parameters**:
- `mentor_vectors`: TF-IDF vectors for mentors
- `mentee_vectors`: TF-IDF vectors for mentees
- `mentor_locations`: List of mentor location strings
- `mentee_locations`: List of mentee location strings
- `profile_weight`: 0.7 (70%)
- `location_weight`: 0.3 (30%)

**Process**:
1. Compute profile similarity (cosine similarity)
2. Compute location similarity (if locations provided)
3. Normalize weights to ensure they sum to 1.0
4. Combine: `final = profile_weight × profile_sim + location_weight × location_sim`
5. Handle NaN values

**Returns**: Combined similarity matrix (n_mentees × n_mentors)

#### 6. `match_mentees_to_mentors(mentors, mentees, similarity_matrix)`

**Purpose**: Performs greedy matching while respecting capacity constraints

**Algorithm**: Greedy (not optimal, but efficient and good quality)

**Process**:
1. Initialize capacity tracking for each mentor
2. Create list of all possible (mentee_index, mentor_index, score) tuples
3. Sort by similarity score (descending - highest first)
4. Iterate through sorted pairs:
   - Check if mentor has available capacity
   - Check if mentee is not already assigned
   - If both checks pass: assign mentee to mentor, decrement capacity
5. Format results with mentor info and assignments

**Constraints Respected**:
- Each mentee assigned to at most one mentor
- Each mentor can have at most `mentor_capacity` mentees
- Only assigns if similarity score > 0

**Returns**: Dictionary mapping mentor IDs to assignment lists

#### 7. `perform_matching(mentors_data, mentees_data)`

**Purpose**: Main orchestration function that coordinates the entire matching process

**Process**:
1. Filter mentors (only willing with capacity > 0)
2. Validate inputs (check for empty lists)
3. Extract text from all profiles
4. Vectorize all profiles together
5. Compute profile similarity
6. Extract locations
7. Compute location similarity
8. Combine similarities
9. Perform greedy matching
10. Calculate statistics
11. Return formatted results

**Returns**: Dictionary with:
- `success`: Boolean
- `message`: Status message
- `statistics`: Matching statistics
- `matches`: Dictionary of mentor assignments

---

## Example Calculation

### Scenario: Matching a Mentor and Student

**Mentor Profile**:
```json
{
    "skills": ["Python", "Machine Learning", "Data Science"],
    "major": "Computer Science",
    "location": "San Francisco, CA",
    "projects": [{"name": "ML Model", "tech": "TensorFlow"}]
}
```

**Student Profile**:
```json
{
    "skills": ["Python", "ML", "Data Analysis"],
    "major": "Computer Science",
    "relevant_coursework": ["Machine Learning", "Data Structures"],
    "location": "San Francisco, California"
}
```

### Step-by-Step Calculation

#### 1. Profile Text Extraction

**Mentor Text**:
```
"Python Machine Learning Data Science Computer Science ML Model TensorFlow"
```

**Student Text**:
```
"Python ML Data Analysis Computer Science Machine Learning Data Structures"
```

#### 2. TF-IDF Vectorization

Both texts are converted to vectors (example simplified):
- Mentor vector: `[0.3, 0.4, 0.2, 0.5, ...]` (5000 dimensions)
- Student vector: `[0.3, 0.3, 0.3, 0.5, ...]` (5000 dimensions)

#### 3. Profile Similarity (Cosine)

```
cosine_similarity(mentor_vector, student_vector) = 0.82
```

#### 4. Location Normalization

**Mentor**: "San Francisco, CA" → "san francisco california"
**Student**: "San Francisco, California" → "san francisco california"

#### 5. Location Similarity

Exact match after normalization → **1.0**

#### 6. Combined Score

```
Final Score = 0.7 × 0.82 + 0.3 × 1.0
            = 0.574 + 0.3
            = 0.874
```

**Result**: High similarity score (0.874) - Good match!

---

## Configuration Parameters

### TF-IDF Settings

Located in `vectorize_profiles()`:
```python
TfidfVectorizer(
    max_features=5000,      # Maximum vocabulary size
    ngram_range=(1, 2),     # Unigrams and bigrams
    min_df=1,               # Minimum document frequency
    stop_words='english',   # Remove stop words
    lowercase=True,         # Case-insensitive
    strip_accents='unicode' # Remove accents
)
```

### Similarity Weights

Located in `compute_similarity_scores()`:
```python
profile_weight=0.7   # 70% for profile data
location_weight=0.3  # 30% for location
```

**Tuning Options**:
- Increase `profile_weight` if skills/major are more important
- Increase `location_weight` if geographic proximity matters more
- Ensure weights sum to 1.0

### Location Matching

Located in `compute_location_similarity()`:
- Exact match threshold: Normalized strings must be identical
- Partial match scaling: Jaccard similarity × 0.5 (max 0.5)
- State abbreviations: 50 US states supported

---

## Data Flow

### Input Format

```json
{
    "mentors": [
        {
            "id": 1,
            "name": "John Doe",
            "skills": ["Python", "ML"],
            "major": "Computer Science",
            "location": "New York, NY",
            "mentor_capacity": 3,
            "willing_to_be_mentor": true
        }
    ],
    "mentees": [
        {
            "student_id": "uuid-123",
            "name": "Jane Smith",
            "skills": ["Python", "Data Science"],
            "major": "Computer Science",
            "relevant_coursework": ["ML", "Statistics"],
            "location": "New York City"
        }
    ]
}
```

### Output Format

```json
{
    "success": true,
    "message": "Successfully matched 15 mentees to mentors",
    "statistics": {
        "total_mentors": 10,
        "total_mentees": 20,
        "total_mentees_assigned": 15,
        "total_capacity": 20,
        "utilization_rate": 75.0
    },
    "matches": {
        "1": {
            "mentor_id": 1,
            "mentor_name": "John Doe",
            "capacity": 3,
            "assigned_count": 2,
            "mentees": [
                {
                    "mentee_id": "uuid-123",
                    "mentee_name": "Jane Smith",
                    "similarity_score": 0.874
                }
            ]
        }
    }
}
```

---

## Key Features

1. **Multi-Factor Similarity**: Combines profile content and location
2. **TF-IDF Vectorization**: Captures importance of terms across profiles
3. **Location Normalization**: Handles variations in location format
4. **Weighted Combination**: Customizable weights for profile vs location
5. **Greedy Matching**: Efficient algorithm that respects capacity constraints
6. **Robust Handling**: Handles empty profiles, missing locations, NaN values

---

## Edge Cases Handled

1. **Empty Profiles**: Returns zero vectors, similarity = 0.0
2. **Missing Locations**: Location similarity = 0.0, uses only profile similarity
3. **NaN Values**: Replaced with 0.0 in similarity matrices
4. **Zero Vectors**: Cosine similarity handles gracefully
5. **All Empty Text**: Creates dummy vectors to avoid errors
6. **TF-IDF Failures**: Falls back to CountVectorizer

---

## Performance Notes

- **Time Complexity**: O(n² × f) where n = total profiles, f = features
- **Space Complexity**: O(n × f) for vectors
- **Optimizations**:
  - Max 5000 features limits memory
  - All profiles vectorized together for efficiency
  - Greedy algorithm is O(n log n) for sorting

---

## Usage

The script is executed by the Node.js backend service:

```javascript
// In services/matching.service.js
const result = await executePythonScript(scriptPath, inputJson);
```

The Python script reads JSON from stdin or a file and outputs JSON to stdout.

---

*Last Updated: 2024*

