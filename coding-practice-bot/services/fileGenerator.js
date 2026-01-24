const fs = require('fs');
const path = require('path');

class FileGenerator {
  constructor() {
    // Base directory for Codewars downloads
    this.codewarsDir = path.join(__dirname, '../data/codewars');
    this.ensureDirectoryExists();
  }

  ensureDirectoryExists() {
    if (!fs.existsSync(this.codewarsDir)) {
      fs.mkdirSync(this.codewarsDir, { recursive: true });
    }
  }

  /**
   * Clean description for use in Python comments
   */
  cleanDescriptionForComments(description) {
    if (!description) return '';
    
    let clean = description;
    
    // Remove Codewars conditional blocks
    clean = clean
      .replace(/~+if[^~\n]*\n[\s\S]*?\n~/g, '')
      .replace(/^~+|~+$/gm, '')
      .replace(/\n~+\n/g, '\n')
      .replace(/~+/g, '')
      .replace(/\n{3,}/g, '\n\n');
    
    // Convert markdown code blocks to plain text
    clean = clean.replace(/```[\s\S]*?```/g, (match) => {
      // Extract code from code blocks and format as comment
      const code = match.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
      return `\nExample:\n${code.split('\n').map(line => `# ${line}`).join('\n')}\n`;
    });
    
    // Remove inline code backticks
    clean = clean.replace(/`([^`]+)`/g, '$1');
    
    return clean.trim();
  }

  /**
   * Generate a starter Python file for a problem
   */
  generateStarterFile(problem) {
    const description = this.cleanDescriptionForComments(problem.description || '');
    
    // Generate filename from problem title/slug
    const filename = problem.slug 
      ? problem.slug.replace(/[^a-z0-9-]/gi, '_').toLowerCase()
      : `problem_${problem.id}`;
    
    const filePath = path.join(this.codewarsDir, `${filename}.py`);
    
    // Build file content
    let content = `"""
${problem.title}
${problem.source.toUpperCase()} - ${problem.difficulty.toUpperCase()}
${problem.rank ? `Rank: ${problem.rank.name}` : ''}
Problem ID: ${problem.id}
URL: ${problem.url}
"""

`;
    
    // Add description as comments
    if (description) {
      content += `"""
Problem Description:
${description.split('\n').map(line => line.trim() ? line : '').join('\n')}
"""

`;
    }
    
    // Add tags if available
    if (problem.tags && problem.tags.length > 0) {
      content += `# Tags: ${problem.tags.join(', ')}\n\n`;
    }
    
    // Add function template based on problem
    content += `# TODO: Implement your solution here
# Start coding below this line:

def solution():
    """
    Your solution goes here.
    
    Returns:
        The expected return type based on the problem description.
    """
    pass


# === YOUR SOLUTION ===
# Your solution will be saved here automatically when you submit via /submit


# Test your solution (uncomment to test locally)
# if __name__ == "__main__":
#     # Add test cases here
#     pass
`;
    
    // Save file
    fs.writeFileSync(filePath, content, 'utf8');
    
    return {
      filePath,
      filename: `${filename}.py`,
      content,
    };
  }

  /**
   * Get file as Buffer for Discord attachment
   */
  getFileBuffer(problem) {
    const { content } = this.generateStarterFile(problem);
    return Buffer.from(content, 'utf8');
  }

  /**
   * Get file path for a problem (for saving solutions later)
   */
  getProblemFilePath(problem) {
    const filename = problem.slug 
      ? problem.slug.replace(/[^a-z0-9-]/gi, '_').toLowerCase()
      : `problem_${problem.id}`;
    return path.join(this.codewarsDir, `${filename}.py`);
  }

  /**
   * Save solution to the problem file
   */
  saveSolution(problem, solutionCode) {
    const filePath = this.getProblemFilePath(problem);
    
    // Read existing file if it exists
    let existingContent = '';
    if (fs.existsSync(filePath)) {
      existingContent = fs.readFileSync(filePath, 'utf8');
    } else {
      // Generate starter file if it doesn't exist
      this.generateStarterFile(problem);
      existingContent = fs.readFileSync(filePath, 'utf8');
    }
    
    // Find the solution marker or add solution section
    const solutionMarker = '# === YOUR SOLUTION ===';
    const solutionSection = `\n\n${solutionMarker}\n# Solution submitted: ${new Date().toISOString()}\n\n${solutionCode}\n`;
    
    if (existingContent.includes(solutionMarker)) {
      // Replace existing solution
      const beforeSolution = existingContent.split(solutionMarker)[0];
      const newContent = beforeSolution + solutionSection;
      fs.writeFileSync(filePath, newContent, 'utf8');
    } else {
      // Append solution
      fs.appendFileSync(filePath, solutionSection, 'utf8');
    }
    
    return filePath;
  }
}

module.exports = FileGenerator;
