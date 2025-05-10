#!/bin/bash

# Output file where all contents will be written
output_file="project_contents.txt"

# Create or clear the output file
> "$output_file"

# Files to exclude (add more patterns as needed)
exclude_patterns=(
    "*.env"
    "*.env.local"
    "*.mjs"
    "node_modules"
    ".git"
    ".next"
    "package-lock.json"
    "*.tsbuildinfo"
)

# Convert exclude patterns to find command exclusions
exclude_args=()
for pattern in "${exclude_patterns[@]}"; do
    exclude_args+=("-not" "-path" "*/$pattern" "-not" "-path" "*/$pattern/*")
done

# Find all files, excluding the specified patterns
find . -type f "${exclude_args[@]}" | while read -r file; do
    # Get file extension
    ext="${file##*.}"
    
    # List of allowed extensions
    allowed_extensions=("js" "ts" "py" "txt" "tsx" "json" "md" "css" "scss" "html" "jsx")
    
    # Check if the file extension is in the allowed list
    if [[ " ${allowed_extensions[@]} " =~ " ${ext} " ]]; then
        echo -e "\n// File Path: ${file#./}\n" >> "$output_file"
        cat "$file" >> "$output_file"
        echo -e "\n" >> "$output_file"
    fi
done

echo "File contents have been copied to $output_file"
