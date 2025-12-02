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


def extract_text_from_profile(profile: Dict[str, Any]) -> str:
    """
    Extract and combine all textual information from a profile into a single text string.
    
    Args:
        profile: Dictionary containing profile data (alumni or student)
    
    Returns:
        Combined text string with all relevant profile information
    """
    text_parts = []
    
    # Extract skills (array)
    if profile.get('skills') and isinstance(profile['skills'], list):
        skills_text = ' '.join([str(skill) for skill in profile['skills']])
        text_parts.append(skills_text)
    
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
    
    # Extract projects (array of objects)
    if profile.get('projects') and isinstance(profile['projects'], list):
        for project in profile['projects']:
            if isinstance(project, dict):
                project_text = ' '.join([str(v) for v in project.values() if isinstance(v, str)])
                text_parts.append(project_text)
            elif isinstance(project, str):
                text_parts.append(project)
    
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
    
    # Combine all text parts
    combined_text = ' '.join(text_parts)
    
    # Clean up: remove extra whitespace
    combined_text = re.sub(r'\s+', ' ', combined_text).strip()
    
    return combined_text if combined_text else ''


def vectorize_profiles(profiles: List[Dict[str, Any]]) -> Tuple[np.ndarray, TfidfVectorizer]:
    """
    Convert profiles to numerical vectors using TF-IDF.
    
    Args:
        profiles: List of profile dictionaries
    
    Returns:
        Tuple of (vector_matrix, vectorizer) where vector_matrix is the TF-IDF vectors
    """
    # Extract text from each profile
    texts = [extract_text_from_profile(profile) for profile in profiles]
    
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


def compute_similarity_scores(
    mentor_vectors: np.ndarray,
    mentee_vectors: np.ndarray
) -> np.ndarray:
    """
    Compute cosine similarity scores between all mentors and mentees.
    
    Args:
        mentor_vectors: Matrix of mentor profile vectors (n_mentors x n_features)
        mentee_vectors: Matrix of mentee profile vectors (n_mentees x n_features)
    
    Returns:
        Similarity matrix (n_mentees x n_mentors) where entry [i, j] is similarity
        between mentee i and mentor j
    """
    # Compute cosine similarity
    similarity_matrix = cosine_similarity(mentee_vectors, mentor_vectors)
    
    # Handle NaN values (can occur when comparing zero vectors)
    # Replace NaN with 0 (zero vectors have no similarity)
    similarity_matrix = np.nan_to_num(similarity_matrix, nan=0.0, posinf=1.0, neginf=0.0)
    
    return similarity_matrix


def match_mentees_to_mentors(
    mentors: List[Dict[str, Any]],
    mentees: List[Dict[str, Any]],
    similarity_matrix: np.ndarray
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Match mentees to mentors based on similarity scores while respecting mentor capacity.
    
    Args:
        mentors: List of mentor profile dictionaries
        mentees: List of mentee profile dictionaries
        similarity_matrix: Similarity matrix (n_mentees x n_mentors)
    
    Returns:
        Dictionary mapping mentor IDs to lists of assigned mentees with similarity scores
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
    
    # Create list of (mentee_index, mentor_index, similarity_score) tuples
    # Sort by similarity score (descending)
    matches = []
    for mentee_idx in range(len(mentees)):
        for mentor_idx in range(len(mentors)):
            mentor_id = mentors[mentor_idx].get('id')
            if mentor_id in mentor_capacities:
                similarity = similarity_matrix[mentee_idx, mentor_idx]
                matches.append((mentee_idx, mentor_idx, similarity))
    
    # Sort by similarity score (descending)
    matches.sort(key=lambda x: x[2], reverse=True)
    
    # Assign mentees to mentors greedily
    for mentee_idx, mentor_idx, similarity in matches:
        mentor_id = mentors[mentor_idx].get('id')
        
        # Check if mentor still has capacity
        if mentor_id in mentor_capacities and mentor_capacities[mentor_id] > 0:
            # Check if mentee is not already assigned
            mentee_id = mentees[mentee_idx].get('student_id') or mentees[mentee_idx].get('id')
            already_assigned = any(
                assigned['mentee_id'] == mentee_id
                for assigned in mentor_assignments[mentor_id]
            )
            
            if not already_assigned:
                # Assign mentee to mentor
                mentor_assignments[mentor_id].append({
                    'mentee_id': mentee_id,
                    'mentee_name': mentees[mentee_idx].get('name', 'Unknown'),
                    'mentee_email': mentees[mentee_idx].get('email', ''),
                    'similarity_score': float(similarity)
                })
                mentor_capacities[mentor_id] -= 1
    
    # Format output: include mentor info and assignments
    result = {}
    for mentor in mentors:
        mentor_id = mentor.get('id')
        if mentor_id in mentor_assignments:
            result[str(mentor_id)] = {
                'mentor_id': mentor_id,
                'mentor_name': mentor.get('name', 'Unknown'),
                'mentor_email': mentor.get('email', ''),
                'capacity': mentor.get('mentor_capacity') or 0,
                'assigned_count': len(mentor_assignments[mentor_id]),
                'mentees': mentor_assignments[mentor_id]
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
    # Filter mentors: only include those willing to be mentors
    # Handle None values for mentor_capacity (convert None to 0)
    mentors = [
        mentor for mentor in mentors_data
        if mentor.get('willing_to_be_mentor') and (mentor.get('mentor_capacity') or 0) > 0
    ]
    
    if not mentors:
        return {
            'success': False,
            'message': 'No mentors available for matching',
            'matches': {}
        }
    
    if not mentees_data:
        return {
            'success': False,
            'message': 'No mentees available for matching',
            'matches': {}
        }
    
    # Vectorize profiles
    print(f"Vectorizing {len(mentors)} mentors and {len(mentees_data)} mentees...", file=sys.stderr)
    
    # Debug: Check profile text content
    mentor_texts = [extract_text_from_profile(m) for m in mentors]
    mentee_texts = [extract_text_from_profile(m) for m in mentees_data]
    
    # Count non-empty profiles
    non_empty_mentors = sum(1 for t in mentor_texts if t.strip())
    non_empty_mentees = sum(1 for t in mentee_texts if t.strip())
    print(f"Profiles with text data: {non_empty_mentors}/{len(mentors)} mentors, {non_empty_mentees}/{len(mentees_data)} mentees", file=sys.stderr)
    
    # Sample a few profile texts for debugging (first 100 chars)
    if len(mentor_texts) > 0:
        sample_mentor_text = mentor_texts[0][:100] if mentor_texts[0] else "(empty)"
        print(f"Sample mentor text (first 100 chars): {sample_mentor_text}", file=sys.stderr)
    if len(mentee_texts) > 0:
        sample_mentee_text = mentee_texts[0][:100] if mentee_texts[0] else "(empty)"
        print(f"Sample mentee text (first 100 chars): {sample_mentee_text}", file=sys.stderr)
    
    mentor_vectors, mentor_vectorizer = vectorize_profiles(mentors)
    mentee_vectors, _ = vectorize_profiles(mentees_data)
    
    # Ensure vectors have same dimensionality
    # If vectorizers are different, we need to align them
    # For simplicity, we'll vectorize all profiles together to ensure same feature space
    all_profiles = mentors + mentees_data
    all_vectors, _ = vectorize_profiles(all_profiles)
    
    mentor_vectors = all_vectors[:len(mentors)]
    mentee_vectors = all_vectors[len(mentors):]
    
    # Debug: Check if vectors are all zeros
    mentor_nonzero = np.count_nonzero(mentor_vectors)
    mentee_nonzero = np.count_nonzero(mentee_vectors)
    print(f"Non-zero vector elements: {mentor_nonzero} in mentor vectors, {mentee_nonzero} in mentee vectors", file=sys.stderr)
    
    # Compute similarity scores
    print("Computing similarity scores...", file=sys.stderr)
    similarity_matrix = compute_similarity_scores(mentor_vectors, mentee_vectors)
    
    # Debug: Check similarity matrix statistics
    if similarity_matrix.size > 0:
        max_sim = np.max(similarity_matrix)
        min_sim = np.min(similarity_matrix)
        mean_sim = np.mean(similarity_matrix)
        nonzero_sim = np.count_nonzero(similarity_matrix)
        print(f"Similarity matrix stats: max={max_sim:.4f}, min={min_sim:.4f}, mean={mean_sim:.4f}, non-zero={nonzero_sim}/{similarity_matrix.size}", file=sys.stderr)
    
    # Match mentees to mentors
    print("Matching mentees to mentors...", file=sys.stderr)
    matches = match_mentees_to_mentors(mentors, mentees_data, similarity_matrix)
    
    # Calculate statistics
    total_mentees_assigned = sum(len(m['mentees']) for m in matches.values())
    # Handle None values for mentor_capacity (convert None to 0)
    total_capacity = sum((m.get('mentor_capacity') or 0) for m in mentors)
    
    return {
        'success': True,
        'message': f'Successfully matched {total_mentees_assigned} mentees to mentors',
        'statistics': {
            'total_mentors': len(mentors),
            'total_mentees': len(mentees_data),
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

