#!/usr/bin/env python3

import sys
import json
import requests # Moved here
from bs4 import BeautifulSoup
import textstat
import argparse

def _audit_readability(html_content, source_identifier="N/A"):
    results = {
        "target": source_identifier,
        "flesch_reading_ease": None,
        "flesch_kincaid_grade": None,
        "issues": []
    }
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract main text content. We'll look for common content containers.
        # This is a heuristic and might need refinement based on actual blog post structure.
        main_content_div = soup.find('div', class_='blog-content') or \
                           soup.find('article') or \
                           soup.find('body')
        
        if main_content_div:
            # Get all text, excluding script and style tags
            for script_or_style in main_content_div(["script", "style"]):
                script_or_style.extract()
            text = main_content_div.get_text(separator=' ', strip=True)
            
            if text:
                results["flesch_reading_ease"] = textstat.flesch_reading_ease(text)
                results["flesch_kincaid_grade"] = textstat.flesch_kincaid_grade(text)
            else:
                results["issues"].append({
                    "type": "WARNING",
                    "message": f"Could not extract sufficient readable text from {source_identifier} for readability audit."
                })
        else:
            results["issues"].append({
                "type": "WARNING",
                "message": f"Could not find a main content container (e.g., <div class='blog-content'> or <article>) in {source_identifier} to audit readability."
            })
        
    except Exception as e:
        results["issues"].append({
            "type": "ERROR",
            "message": f"An unexpected error occurred while processing {source_identifier}: {e}"
        })
    
    return {"audit_type": "readability", "results": results, "issues": results["issues"]}


def audit(target_content, target_type='html_content', **kwargs):
    """
    Performs readability audit on the given target content.

    Args:
        target_content: The content to audit. Can be an HTML string, a file path, or a URL.
        target_type (str): Specifies the type of target_content ('html_content', 'file_path', or 'url').
        **kwargs: Additional options.

    Returns:
        dict: Standardized audit results including 'audit_type', 'results', and 'issues'.
    """
    html_content = ""
    source_identifier = kwargs.get('source_identifier', target_content)

    try:
        if target_type == 'html_content':
            html_content = target_content
        elif target_type == 'file_path':
            with open(target_content, 'r', encoding='utf-8') as f:
                html_content = f.read()
        elif target_type == 'url':
            response = requests.get(target_content, timeout=10)
            response.raise_for_status()
            html_content = response.text
        else:
            return {
                "audit_type": "readability",
                "issues": [{
                    "type": "ERROR",
                    "message": f"Unsupported target_type: {target_type}",
                    "source": source_identifier
                }]
            }

        if not html_content:
            return {
                "audit_type": "readability",
                "issues": [{
                    "type": "ERROR",
                    "message": "No HTML content provided or fetched for audit.",
                    "source": source_identifier
                }]
            }
            
        return _audit_readability(html_content, source_identifier)

    except requests.exceptions.RequestException as e:
        return {
            "audit_type": "readability",
            "issues": [{
                "type": "ERROR",
                "message": f"Failed to fetch URL {source_identifier}: {e}",
                "source": source_identifier
            }]
        }
    except IOError as e:
        return {
            "audit_type": "readability",
            "issues": [{
                "type": "ERROR",
                "message": f"Failed to read file {source_identifier}: {e}",
                "source": source_identifier
            }]
        }
    except Exception as e:
        return {
            "audit_type": "readability",
            "issues": [{
                "type": "ERROR",
                "message": f"An unexpected error occurred during content acquisition: {e}",
                "source": source_identifier
            }]
        }
