const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

class CodeValidator {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'coding-bot');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  extractCodeFromMessage(message) {
    // Try to extract code from code blocks
    const codeBlockRegex = /```(?:python)?\s*([\s\S]*?)```/;
    const match = message.match(codeBlockRegex);

    if (match) {
      return match[1].trim();
    }

    // Try inline code
    const inlineRegex = /`([^`]+)`/g;
    const inlineMatches = [...message.matchAll(inlineRegex)];
    if (inlineMatches.length > 0) {
      // Combine inline code blocks
      return inlineMatches.map((m) => m[1]).join('\n');
    }

    // If no code blocks, assume entire message is code (for file attachments)
    return message.trim();
  }

  async extractCodeFromAttachment(attachment) {
    try {
      const response = await axios.get(attachment.url);
      return response.data.trim();
    } catch (error) {
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }

  async validateSyntax(code) {
    return new Promise((resolve) => {
      const tempFile = path.join(this.tempDir, `syntax_check_${Date.now()}.py`);

      try {
        fs.writeFileSync(tempFile, code);
      } catch (error) {
        resolve({ valid: false, error: `Failed to write temp file: ${error.message}` });
        return;
      }

      const python = spawn('python3', ['-m', 'py_compile', tempFile]);

      let stderr = '';

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        // Clean up
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0) {
          resolve({ valid: true });
        } else {
          // Parse Python syntax error
          const errorMatch = stderr.match(/File ".*", line (\d+)(?:, in .+)?\n(.+)/);
          resolve({
            valid: false,
            error: errorMatch ? `Line ${errorMatch[1]}: ${errorMatch[2].trim()}` : stderr.trim(),
          });
        }
      });

      python.on('error', (error) => {
        resolve({ valid: false, error: `Python not found: ${error.message}` });
      });
    });
  }

  async runTests(code, testCases) {
    // Basic test runner - runs code and checks output
    // For production, you'd want a sandboxed environment
    return new Promise((resolve) => {
      const tempFile = path.join(this.tempDir, `test_${Date.now()}.py`);

      try {
        // Wrap code in test harness
        const testCode = `
${code}

# Test cases
if __name__ == "__main__":
    try:
${testCases
  .map(
    (tc, i) => `        result_${i} = ${tc.call}
        assert result_${i} == ${tc.expected}, f"Test ${i} failed: expected ${tc.expected}, got {result_${i}}"
        print(f"Test ${i} passed")`
  )
  .join('\n')}
        print("All tests passed!")
    except AssertionError as e:
        print(f"Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"Error: {e}")
        exit(1)
`;
        fs.writeFileSync(tempFile, testCode);
      } catch (error) {
        resolve({ passed: false, error: `Failed to write test file: ${error.message}` });
        return;
      }

      const python = spawn('python3', [tempFile]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        // Clean up
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code === 0 && stdout.includes('All tests passed')) {
          resolve({ passed: true, output: stdout });
        } else {
          resolve({
            passed: false,
            error: stderr || stdout || 'Tests failed',
            output: stdout,
          });
        }
      });

      python.on('error', (error) => {
        resolve({ passed: false, error: `Python not found: ${error.message}` });
      });
    });
  }

  async validateCode(code, problem = null) {
    // First check syntax
    const syntaxCheck = await this.validateSyntax(code);

    if (!syntaxCheck.valid) {
      return {
        valid: false,
        passed: false,
        error: syntaxCheck.error,
        type: 'syntax',
      };
    }

    // If problem has test cases, run them
    if (problem && problem.testCases) {
      const testResult = await this.runTests(code, problem.testCases);
      return {
        valid: true,
        passed: testResult.passed,
        error: testResult.error,
        output: testResult.output,
        type: testResult.passed ? 'passed' : 'failed',
      };
    }

    // Just syntax check passed
    return {
      valid: true,
      passed: null, // No tests to run
      type: 'syntax_only',
    };
  }
}

module.exports = CodeValidator;
