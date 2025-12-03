"""
Mentor-Mentee Matching System
Converts textual profiles to vectors and matches mentees to mentors based on similarity scores
while respecting mentor capacity constraints.
"""

import json
import sys
from typing import List, Dict, Tuple, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re


def extract_text_from_profile(profile: Dict[str, Any], is_student: bool = False) -> str:
    """
    Extract and combine all textual information from a profile into a single text string.
    For students: prioritizes mentor_preference, skills, projects, then other fields.
    For mentors: prioritizes skills, projects, then other fields.
    
    Args:
        profile: Dictionary containing profile data (alumni or student)
        is_student: Boolean indicating if this is a student profile (default: False)
    
    Returns:
        Combined text string with all relevant profile information
    """
    text_parts = []
    
    # For students: prioritize mentor_preference first
    if is_student:
        # Extract mentor_preference (for students - string)
        if profile.get('mentor_preference'):
            mentor_pref = str(profile['mentor_preference']).strip()
            if mentor_pref:
                text_parts.append(mentor_pref)
    
    # Extract skills (array) - high priority for both
    if profile.get('skills') and isinstance(profile['skills'], list):
        skills_text = ' '.join([str(skill) for skill in profile['skills']])
        text_parts.append(skills_text)
    
    # Extract projects (array of objects) - high priority for both
    if profile.get('projects') and isinstance(profile['projects'], list):
        for project in profile['projects']:
            if isinstance(project, dict):
                project_text = ' '.join([str(v) for v in project.values() if isinstance(v, str)])
                text_parts.append(project_text)
            elif isinstance(project, str):
                text_parts.append(project)
    
    # Extract aspirations (string)
    if profile.get('aspirations'):
        text_parts.append(str(profile['aspirations']))
    
    # Extract parsed_resume (JSON object)
    if profile.get('parsed_resume'):
        parsed_resume = profile['parsed_resume']
        if isinstance(parsed_resume, str):
            try:
                parsed_resume = json.loads(parsed_resume)
            except json.JSONDecodeError:
                pass
        
        if isinstance(parsed_resume, dict):
            # Extract text from common resume fields
            resume_text_fields = ['summary', 'objective', 'description', 'text', 'content']
            for field in resume_text_fields:
                if field in parsed_resume:
                    text_parts.append(str(parsed_resume[field]))
            
            # Extract all string values from the resume
            def extract_dict_values(obj, max_depth=3, current_depth=0):
                if current_depth >= max_depth:
                    return []
                values = []
                if isinstance(obj, dict):
                    for value in obj.values():
                        values.extend(extract_dict_values(value, max_depth, current_depth + 1))
                elif isinstance(obj, list):
                    for item in obj:
                        values.extend(extract_dict_values(item, max_depth, current_depth + 1))
                elif isinstance(obj, str) and len(obj.strip()) > 0:
                    values.append(obj.strip())
                return values
            
            resume_values = extract_dict_values(parsed_resume)
            text_parts.extend(resume_values)
    
    # Extract experiences (array of objects)
    if profile.get('experiences') and isinstance(profile['experiences'], list):
        for exp in profile['experiences']:
            if isinstance(exp, dict):
                exp_text = ' '.join([str(v) for v in exp.values() if isinstance(v, str)])
                text_parts.append(exp_text)
            elif isinstance(exp, str):
                text_parts.append(exp)
    
    # Extract achievements (array)
    if profile.get('achievements') and isinstance(profile['achievements'], list):
        achievements_text = ' '.join([str(ach) for ach in profile['achievements']])
        text_parts.append(achievements_text)
    
    # Extract major (for students)
    if profile.get('major'):
        text_parts.append(str(profile['major']))
    
    # Extract relevant_coursework (for students - array)
    if profile.get('relevant_coursework') and isinstance(profile['relevant_coursework'], list):
        coursework_text = ' '.join([str(course) for course in profile['relevant_coursework']])
        text_parts.append(coursework_text)
    
    # Combine all text parts
    combined_text = ' '.join(text_parts)
    
    # Clean up: remove extra whitespace
    combined_text = re.sub(r'\s+', ' ', combined_text).strip()
    
    return combined_text if combined_text else ''


def vectorize_profiles(profiles: List[Dict[str, Any]], is_students: bool = False) -> Tuple[np.ndarray, TfidfVectorizer]:
    """
    Convert profiles to numerical vectors using TF-IDF.
    
    Args:
        profiles: List of profile dictionaries
        is_students: Boolean indicating if these are student profiles (default: False)
    
    Returns:
        Tuple of (vector_matrix, vectorizer) where vector_matrix is the TF-IDF vectors
    """
    # Extract text from each profile
    texts = [extract_text_from_profile(profile, is_student=is_students) for profile in profiles]
    
    # If all texts are empty, create dummy text to avoid errors
    if all(not text for text in texts):
        texts = ['dummy text'] * len(profiles)
    
    # Create TF-IDF vectorizer
    # Using max_features to limit dimensionality and improve performance
    vectorizer = TfidfVectorizer(
        max_features=5000,  # Limit to top 5000 features
        ngram_range=(1, 2),  # Use unigrams and bigrams
        min_df=1,  # Minimum document frequency
        stop_words='english',  # Remove common English stop words
        lowercase=True,
        strip_accents='unicode'
    )
    
    # Check if we have any non-empty text
    non_empty_texts = [text for text in texts if text.strip()]
    
    if not non_empty_texts:
        # If all profiles are empty, return zero vectors
        # Create dummy vectorizer to maintain shape
        from sklearn.feature_extraction.text import CountVectorizer
        vectorizer = CountVectorizer()
        # Return zero matrix with shape (n_profiles, 1)
        vectors = np.zeros((len(profiles), 1))
        print(f"Warning: All {len(profiles)} profiles have empty text data. Returning zero vectors.", file=sys.stderr)
        return vectors, vectorizer
    
    # Vectorize the texts
    try:
        vectors = vectorizer.fit_transform(texts)
        
        # Check if vectors are all zeros
        if vectors.nnz == 0:
            print(f"Warning: TF-IDF vectors are all zeros. This means no text features were extracted.", file=sys.stderr)
    except ValueError as e:
        print(f"Error in TF-IDF vectorization: {e}. Falling back to CountVectorizer.", file=sys.stderr)
        # Fallback: if vectorization fails, use CountVectorizer
        from sklearn.feature_extraction.text import CountVectorizer
        vectorizer = CountVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            min_df=1,
            stop_words='english',
            lowercase=True,
            strip_accents='unicode'
        )
        vectors = vectorizer.fit_transform(texts)
    
    return vectors.toarray(), vectorizer


def normalize_location(location: str) -> str:
    """
    Normalize location string for comparison.
    
    Args:
        location: Location string (e.g., "New York, NY", "New York City")
    
    Returns:
        Normalized location string (lowercase, stripped, common abbreviations expanded)
    """
    if not location or not isinstance(location, str):
        return ''
    
    # Convert to lowercase and strip
    normalized = location.lower().strip()
    
    # Remove common punctuation
    normalized = re.sub(r'[.,;]', '', normalized)
    
    # Expand common abbreviations
    abbreviations = {
        'ny': 'new york',
        'ca': 'california',
        'tx': 'texas',
        'fl': 'florida',
        'il': 'illinois',
        'pa': 'pennsylvania',
        'az': 'arizona',
        'ma': 'massachusetts',
        'tn': 'tennessee',
        'in': 'indiana',
        'mo': 'missouri',
        'md': 'maryland',
        'wi': 'wisconsin',
        'co': 'colorado',
        'mn': 'minnesota',
        'sc': 'south carolina',
        'al': 'alabama',
        'la': 'louisiana',
        'ky': 'kentucky',
        'or': 'oregon',
        'ok': 'oklahoma',
        'ct': 'connecticut',
        'ut': 'utah',
        'ia': 'iowa',
        'nv': 'nevada',
        'ar': 'arkansas',
        'ms': 'mississippi',
        'ks': 'kansas',
        'nm': 'new mexico',
        'ne': 'nebraska',
        'wv': 'west virginia',
        'id': 'idaho',
        'hi': 'hawaii',
        'nh': 'new hampshire',
        'me': 'maine',
        'mt': 'montana',
        'ri': 'rhode island',
        'de': 'delaware',
        'sd': 'south dakota',
        'nd': 'north dakota',
        'ak': 'alaska',
        'dc': 'washington dc',
        'vt': 'vermont',
        'wy': 'wyoming',
    }
    
    # Replace abbreviations
    for abbr, full in abbreviations.items():
        # Match whole word abbreviations
        normalized = re.sub(r'\b' + abbr + r'\b', full, normalized)
    
    # Remove extra whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return normalized


def compute_location_similarity(
    mentor_locations: List[str],
    mentee_locations: List[str]
) -> np.ndarray:
    """
    Compute location similarity scores between mentors and mentees.
    
    Args:
        mentor_locations: List of mentor location strings
        mentee_locations: List of mentee location strings
    
    Returns:
        Location similarity matrix (n_mentees x n_mentors) where entry [i, j] is:
        - 1.0 if locations match exactly (after normalization)
        - 0.5 if locations share a common word (city, state, or country)
        - 0.0 if locations don't match
    """
    n_mentees = len(mentee_locations)
    n_mentors = len(mentor_locations)
    similarity_matrix = np.zeros((n_mentees, n_mentors))
    
    for i, mentee_loc in enumerate(mentee_locations):
        mentee_normalized = normalize_location(mentee_loc) if mentee_loc else ''
        mentee_words = set(mentee_normalized.split()) if mentee_normalized else set()
        
        for j, mentor_loc in enumerate(mentor_locations):
            mentor_normalized = normalize_location(mentor_loc) if mentor_loc else ''
            mentor_words = set(mentor_normalized.split()) if mentor_normalized else set()
            
            # Skip if both are empty
            if not mentee_normalized and not mentor_normalized:
                similarity_matrix[i, j] = 0.0
                continue
            
            # Exact match (after normalization)
            if mentee_normalized == mentor_normalized and mentee_normalized:
                similarity_matrix[i, j] = 1.0
            # Partial match (share common words)
            elif mentee_words and mentor_words:
                common_words = mentee_words.intersection(mentor_words)
                # Remove common stop words
                stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
                common_words = common_words - stop_words
                
                if common_words:
                    # Calculate similarity based on common words
                    # Use Jaccard similarity (intersection over union)
                    union_words = mentee_words.union(mentor_words)
                    if union_words:
                        jaccard = len(common_words) / len(union_words)
                        similarity_matrix[i, j] = jaccard * 0.5  # Scale to 0.5 max for partial matches
                    else:
                        similarity_matrix[i, j] = 0.0
                else:
                    similarity_matrix[i, j] = 0.0
            else:
                similarity_matrix[i, j] = 0.0
    
    return similarity_matrix


def compute_similarity_scores(
    mentor_vectors: np.ndarray,
    mentee_vectors: np.ndarray,
    mentor_locations: List[str] = None,
    mentee_locations: List[str] = None,
    profile_weight: float = 0.7,
    location_weight: float = 0.3
) -> np.ndarray:
    """
    Compute combined similarity scores between all mentors and mentees.
    Combines profile similarity (TF-IDF cosine similarity) with location similarity.
    
    Args:
        mentor_vectors: Matrix of mentor profile vectors (n_mentors x n_features)
        mentee_vectors: Matrix of mentee profile vectors (n_mentees x n_features)
        mentor_locations: List of mentor location strings (optional)
        mentee_locations: List of mentee location strings (optional)
        profile_weight: Weight for profile similarity (default: 0.7)
        location_weight: Weight for location similarity (default: 0.3)
    
    Returns:
        Combined similarity matrix (n_mentees x n_mentors) where entry [i, j] is similarity
        between mentee i and mentor j
    """
    # Compute profile similarity using cosine similarity
    profile_similarity = cosine_similarity(mentee_vectors, mentor_vectors)
    
    # Handle NaN values (can occur when comparing zero vectors)
    profile_similarity = np.nan_to_num(profile_similarity, nan=0.0, posinf=1.0, neginf=0.0)
    
    # Compute location similarity if locations are provided
    if mentor_locations and mentee_locations:
        location_similarity = compute_location_similarity(mentor_locations, mentee_locations)
        
        # Combine profile and location similarities
        # Normalize weights to sum to 1.0
        total_weight = profile_weight + location_weight
        if total_weight > 0:
            profile_weight_norm = profile_weight / total_weight
            location_weight_norm = location_weight / total_weight
            combined_similarity = (profile_weight_norm * profile_similarity + 
                                  location_weight_norm * location_similarity)
        else:
            combined_similarity = profile_similarity
    else:
        # If no locations provided, use only profile similarity
        combined_similarity = profile_similarity
    
    return combined_similarity


def match_mentees_to_mentors(
    mentors: List[Dict[str, Any]],
    mentees: List[Dict[str, Any]],
    similarity_matrix: np.ndarray
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Match mentees to mentors based on similarity scores while respecting mentor capacity.
    Returns only the top-matched student (highest score) for each mentor.
    
    Args:
        mentors: List of mentor profile dictionaries
        mentees: List of mentee profile dictionaries
        similarity_matrix: Similarity matrix (n_mentees x n_mentors)
    
    Returns:
        Dictionary mapping mentor IDs to lists containing only the top-matched mentee with similarity score
    """
    # Initialize mentor capacity tracking
    mentor_capacities = {}
    mentor_assignments = {}
    
    for mentor in mentors:
        mentor_id = mentor.get('id')
        capacity = mentor.get('mentor_capacity')
        
        # Only process mentors who are willing and have capacity
        # Handle None values for capacity (convert None to 0)
        capacity = capacity if capacity is not None else 0
        if mentor.get('willing_to_be_mentor') and capacity > 0:
            mentor_capacities[mentor_id] = capacity
            mentor_assignments[mentor_id] = []
    
    # For each mentor, find the top-matched student (highest similarity score)
    for mentor_idx, mentor in enumerate(mentors):
        mentor_id = mentor.get('id')
        
        if mentor_id not in mentor_capacities:
            continue
        
        # Find the best matching student for this mentor
        best_mentee_idx = None
        best_similarity = -1.0
        
        for mentee_idx in range(len(mentees)):
            similarity = similarity_matrix[mentee_idx, mentor_idx]
            
            # Check if this is the best match so far
            if similarity > best_similarity:
                best_similarity = similarity
                best_mentee_idx = mentee_idx
        
        # If we found a match with similarity > 0, assign it
        if best_mentee_idx is not None and best_similarity > 0:
            mentee_id = mentees[best_mentee_idx].get('student_id') or mentees[best_mentee_idx].get('id')
            mentor_assignments[mentor_id].append({
                'mentee_id': mentee_id,
                'mentee_name': mentees[best_mentee_idx].get('name', 'Unknown'),
                'mentee_email': mentees[best_mentee_idx].get('email', ''),
                'similarity_score': float(best_similarity)
            })
    
    # Format output: include mentor info and assignments (only top student per mentor)
    result = {}
    for mentor in mentors:
        mentor_id = mentor.get('id')
        if mentor_id in mentor_assignments and len(mentor_assignments[mentor_id]) > 0:
            result[str(mentor_id)] = {
                'mentor_id': mentor_id,
                'mentor_name': mentor.get('name', 'Unknown'),
                'mentor_email': mentor.get('email', ''),
                'capacity': mentor.get('mentor_capacity') or 0,
                'assigned_count': len(mentor_assignments[mentor_id]),
                'mentees': mentor_assignments[mentor_id]  # Contains only top student
            }
    
    return result


def perform_matching(mentors_data: List[Dict[str, Any]], mentees_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main function to perform mentor-mentee matching.
    
    Args:
        mentors_data: List of mentor profile dictionaries
        mentees_data: List of mentee profile dictionaries
    
    Returns:
        Dictionary containing matching results
    """
    # Filter mentors: only include those willing to be mentors with capacity > 0
    # Handle None values for mentor_capacity (convert None to 0)
    mentors = [
        mentor for mentor in mentors_data
        if mentor.get('willing_to_be_mentor') and (mentor.get('mentor_capacity') or 0) > 0
    ]
    
    # Filter students: only include those with mentorship_interest = true AND mentor_paired = false
    mentees = []
    for mentee in mentees_data:
        mentorship_interest = mentee.get('mentorship_interest')
        mentor_paired = mentee.get('mentor_paired')
        
        # Check mentorship_interest (handle boolean, string, and None)
        has_interest = (
            mentorship_interest is True or 
            (isinstance(mentorship_interest, str) and mentorship_interest.lower() == 'true') or
            mentorship_interest == 1
        )
        
        # Check mentor_paired (handle boolean, string, and None)
        is_paired = (
            mentor_paired is True or 
            (isinstance(mentor_paired, str) and mentor_paired.lower() == 'true') or
            mentor_paired == 1
        )
        
        if has_interest and not is_paired:
            mentees.append(mentee)
    
    if not mentors:
        return {
            'success': False,
            'message': 'No mentors available for matching (willing_to_be_mentor=true AND capacity>0)',
            'matches': {}
        }
    
    if not mentees:
        return {
            'success': False,
            'message': 'No mentees available for matching (mentorship_interest=true AND mentor_paired=false)',
            'matches': {}
        }
    
    # Vectorize profiles
    print(f"Vectorizing {len(mentors)} mentors and {len(mentees)} mentees...", file=sys.stderr)
    
    # Debug: Check profile text content
    # For mentors: is_student=False, for mentees: is_student=True
    mentor_texts = [extract_text_from_profile(m, is_student=False) for m in mentors]
    mentee_texts = [extract_text_from_profile(m, is_student=True) for m in mentees]
    
    # Count non-empty profiles
    non_empty_mentors = sum(1 for t in mentor_texts if t.strip())
    non_empty_mentees = sum(1 for t in mentee_texts if t.strip())
    print(f"Profiles with text data: {non_empty_mentors}/{len(mentors)} mentors, {non_empty_mentees}/{len(mentees)} mentees", file=sys.stderr)
    
    # Sample a few profile texts for debugging (first 100 chars)
    if len(mentor_texts) > 0:
        sample_mentor_text = mentor_texts[0][:100] if mentor_texts[0] else "(empty)"
        print(f"Sample mentor text (first 100 chars): {sample_mentor_text}", file=sys.stderr)
    if len(mentee_texts) > 0:
        sample_mentee_text = mentee_texts[0][:100] if mentee_texts[0] else "(empty)"
        print(f"Sample mentee text (first 100 chars): {sample_mentee_text}", file=sys.stderr)
    
    # Extract texts with appropriate flags (students get mentor_preference prioritized)
    mentor_texts = [extract_text_from_profile(m, is_student=False) for m in mentors]
    mentee_texts = [extract_text_from_profile(m, is_student=True) for m in mentees]
    
    # Combine all texts for vectorization to ensure same feature space
    all_texts = mentor_texts + mentee_texts
    
    # Vectorize all texts together to ensure same feature space
    from sklearn.feature_extraction.text import TfidfVectorizer
    
    # If all texts are empty, create dummy text to avoid errors
    if all(not text for text in all_texts):
        all_texts = ['dummy text'] * len(all_texts)
    
    # Create TF-IDF vectorizer
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=1,
        stop_words='english',
        lowercase=True,
        strip_accents='unicode'
    )
    
    # Check if we have any non-empty text
    non_empty_texts = [text for text in all_texts if text.strip()]
    
    if not non_empty_texts:
        # If all texts are empty, return zero vectors
        from sklearn.feature_extraction.text import CountVectorizer
        vectorizer = CountVectorizer()
        all_vectors = np.zeros((len(all_texts), 1))
        print(f"Warning: All {len(all_texts)} texts are empty. Returning zero vectors.", file=sys.stderr)
    else:
        # Vectorize the texts
        try:
            vectors = vectorizer.fit_transform(all_texts)
            if vectors.nnz == 0:
                print(f"Warning: TF-IDF vectors are all zeros.", file=sys.stderr)
            all_vectors = vectors.toarray()
        except ValueError as e:
            print(f"Error in TF-IDF vectorization: {e}. Falling back to CountVectorizer.", file=sys.stderr)
            from sklearn.feature_extraction.text import CountVectorizer
            vectorizer = CountVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                min_df=1,
                stop_words='english',
                lowercase=True,
                strip_accents='unicode'
            )
            all_vectors = vectorizer.fit_transform(all_texts).toarray()
    
    # Split back into mentor and mentee vectors
    mentor_vectors = all_vectors[:len(mentors)]
    mentee_vectors = all_vectors[len(mentors):]
    
    # Debug: Check if vectors are all zeros
    mentor_nonzero = np.count_nonzero(mentor_vectors)
    mentee_nonzero = np.count_nonzero(mentee_vectors)
    print(f"Non-zero vector elements: {mentor_nonzero} in mentor vectors, {mentee_nonzero} in mentee vectors", file=sys.stderr)
    
    # Extract locations from profiles
    mentor_locations = [m.get('location', '') or '' for m in mentors]
    mentee_locations = [m.get('location', '') or '' for m in mentees]
    
    # Log location extraction
    mentors_with_location = sum(1 for loc in mentor_locations if loc.strip())
    mentees_with_location = sum(1 for loc in mentee_locations if loc.strip())
    print(f"Locations extracted: {mentors_with_location}/{len(mentors)} mentors, {mentees_with_location}/{len(mentees)} mentees", file=sys.stderr)
    
    # Compute similarity scores (combines profile and location similarity)
    print("Computing similarity scores (profile + location)...", file=sys.stderr)
    similarity_matrix = compute_similarity_scores(
        mentor_vectors, 
        mentee_vectors,
        mentor_locations=mentor_locations,
        mentee_locations=mentee_locations,
        profile_weight=0.7,  # 70% weight for profile data
        location_weight=0.3  # 30% weight for location
    )
    
    # Debug: Check similarity matrix statistics
    if similarity_matrix.size > 0:
        max_sim = np.max(similarity_matrix)
        min_sim = np.min(similarity_matrix)
        mean_sim = np.mean(similarity_matrix)
        nonzero_sim = np.count_nonzero(similarity_matrix)
        print(f"Similarity matrix stats: max={max_sim:.4f}, min={min_sim:.4f}, mean={mean_sim:.4f}, non-zero={nonzero_sim}/{similarity_matrix.size}", file=sys.stderr)
    
    # Match mentees to mentors (returns only top student per mentor)
    print("Matching mentees to mentors (top student per mentor)...", file=sys.stderr)
    matches = match_mentees_to_mentors(mentors, mentees, similarity_matrix)
    
    # Calculate statistics
    total_mentees_assigned = sum(len(m['mentees']) for m in matches.values())
    # Handle None values for mentor_capacity (convert None to 0)
    total_capacity = sum((m.get('mentor_capacity') or 0) for m in mentors)
    
    return {
        'success': True,
        'message': f'Successfully matched {total_mentees_assigned} mentees to mentors',
        'statistics': {
            'total_mentors': len(mentors),
            'total_mentees': len(mentees),
            'total_mentees_assigned': total_mentees_assigned,
            'total_capacity': total_capacity,
            'utilization_rate': round(total_mentees_assigned / total_capacity * 100, 2) if total_capacity > 0 else 0
        },
        'matches': matches
    }


def main():
    """
    Main entry point for the matching script.
    Reads input JSON from stdin or from a file path provided as command-line argument.
    Outputs results to stdout.
    """
    try:
        # Check if file path is provided as command-line argument
        if len(sys.argv) > 1:
            # Read from file
            input_file = sys.argv[1]
            with open(input_file, 'r', encoding='utf-8') as f:
                input_data = json.load(f)
        else:
            # Read input JSON from stdin
            input_data = json.load(sys.stdin)
        
        mentors = input_data.get('mentors', [])
        mentees = input_data.get('mentees', [])
        
        if not mentors and not mentees:
            result = {
                'success': False,
                'message': 'No mentors or mentees provided',
                'matches': {}
            }
        else:
            result = perform_matching(mentors, mentees)
        
        # Output results as JSON
        print(json.dumps(result, indent=2))
        
    except FileNotFoundError as e:
        error_result = {
            'success': False,
            'message': f'Input file not found: {str(e)}',
            'matches': {}
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    except json.JSONDecodeError as e:
        error_result = {
            'success': False,
            'message': f'Invalid JSON input: {str(e)}',
            'matches': {}
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)
    except Exception as e:
        error_result = {
            'success': False,
            'message': f'Error during matching: {str(e)}',
            'matches': {}
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


if __name__ == '__main__':
    main()

