# Test Fixtures Setup for TailorYourCV Testing

## Overview

This directory contains test fixtures needed to run automated tests for the TailorYourCV application using the Flow Testing MCP Server.

## Required Files

### 1. Sample CV File

**File Name**: `sample-cv.pdf` or `sample-cv.docx`

**Location**: Place in this directory (`test-fixtures/`)

#### Option A: Use Your Own CV
The simplest approach - use your actual CV or any real CV you have access to.

#### Option B: Create a Sample CV
If you need to create a test CV, here's a simple template:

**Sample CV Content**:
```
John Doe
Software Engineer
john.doe@email.com | +1 (555) 123-4567 | linkedin.com/in/johndoe | github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Full-Stack Software Engineer with 5+ years of expertise in building scalable web applications using React, Node.js, and modern JavaScript frameworks. Proven track record of leading technical projects and mentoring junior developers.

WORK EXPERIENCE

Senior Software Engineer | TechStart Inc. | Jan 2022 - Present
- Led development of customer dashboard using React 18 and Next.js 14
- Improved application performance by 40% through code optimization
- Mentored team of 3 junior developers
- Implemented CI/CD pipeline reducing deployment time by 60%
- Technologies: React, Next.js, TypeScript, Node.js, PostgreSQL

Software Engineer | WebDev Solutions | Jun 2019 - Dec 2021
- Developed and maintained RESTful APIs using Node.js and Express
- Built responsive frontend interfaces with React and Redux
- Collaborated with designers to implement pixel-perfect UIs
- Participated in code reviews and agile development processes
- Technologies: React, Redux, Node.js, Express, MongoDB

Junior Developer | StartupXYZ | May 2018 - May 2019
- Assisted in development of company website using JavaScript and jQuery
- Fixed bugs and implemented new features based on user feedback
- Learned modern development practices and team collaboration
- Technologies: JavaScript, HTML, CSS, jQuery

EDUCATION

Bachelor of Science in Computer Science
University of Technology | 2014 - 2018
GPA: 3.7/4.0

SKILLS

Languages: JavaScript, TypeScript, Python, SQL
Frontend: React, Next.js, Redux, Tailwind CSS, HTML, CSS
Backend: Node.js, Express, Fastify, REST APIs, GraphQL
Databases: PostgreSQL, MongoDB, Redis
Tools: Git, Docker, AWS, Vercel, CI/CD, Jest

PROJECTS

Open Source Contributor
- Contributed to React ecosystem packages
- 50+ stars on personal GitHub projects
- Active participant in developer communities

CERTIFICATIONS

AWS Certified Developer - Associate | 2023
```

**How to Create**:
1. Copy the content above
2. Open Microsoft Word or Google Docs
3. Paste and format nicely
4. Export as PDF: File → Download/Export as PDF
5. Save as `sample-cv.pdf` in this directory

OR

Use an online CV generator:
- https://www.canva.com/resumes/templates/
- https://resume.io/
- https://www.overleaf.com/latex/templates (for LaTeX fans)

### 2. Sample Job Description (✅ Already Created)

**File**: `sample-job-description.txt`

This file contains a realistic job description for testing the "Tailor for a Job" flow. You can modify it or use it as-is.

## File Structure

After setup, your `test-fixtures/` directory should look like:

```
test-fixtures/
├── README-CV-SETUP.md                  # This file
├── sample-cv.pdf                       # YOUR CV FILE (add this!)
├── sample-job-description.txt          # ✅ Already created
└── tailor-cv-test-missions.json        # ✅ Test mission definitions
```

## Using the Fixtures in Tests

### For CLI Testing

```bash
# The test missions reference these files
mycontext test:run update-cv-flow --url http://localhost:3000

# The AI will automatically upload sample-cv.pdf
# and use the job description from sample-job-description.txt
```

### For MCP Server Testing

When using the MCP server directly:

```typescript
await mcp.create_test_mission({
  name: "test-cv-upload",
  mission: "Upload the CV from test-fixtures/sample-cv.pdf",
  expectedOutcome: "CV is uploaded successfully"
});
```

## Important Notes

### File Requirements

- **CV File Size**: Must be under 5MB (application limit)
- **CV Format**: PDF or DOCX only
- **CV Content**: Should have realistic work experience, education, skills
- **Job Description**: Already provided, but can be customized

### Privacy Considerations

⚠️ **Do NOT commit sensitive information**

- Do not use a real CV with personal information if this repo is public
- Create a dummy/test CV specifically for testing
- Sample data is sufficient - accuracy doesn't matter for tests

### Test Data Realism

For best test results, the CV should contain:
- ✅ Work experience (at least 2-3 roles)
- ✅ Education section
- ✅ Skills section
- ✅ Contact information (can be fake)
- ✅ Dates (can be fake but should be formatted correctly)

## Quick Setup Script

Run this if you want to create a minimal test CV quickly:

```bash
# This creates a basic text-based CV for testing
cat > test-fixtures/sample-cv.txt << 'EOF'
JOHN DOE
Software Engineer
john@example.com

EXPERIENCE
Senior Engineer at TechCorp (2022-Present)
- Built web applications with React and Node.js
- Led team of 5 developers

Engineer at StartupXYZ (2019-2022)
- Developed REST APIs
- Improved performance by 40%

EDUCATION
BS Computer Science, Tech University (2015-2019)

SKILLS
JavaScript, TypeScript, React, Node.js, Python
EOF

# Convert to PDF using pandoc (if installed)
pandoc test-fixtures/sample-cv.txt -o test-fixtures/sample-cv.pdf

# Or just use the text file for testing
# (TailorYourCV accepts both)
```

## Troubleshooting

### "File not found" error during tests

**Solution**: Make sure `sample-cv.pdf` exists in `test-fixtures/` directory

```bash
ls test-fixtures/sample-cv.pdf
# Should show: test-fixtures/sample-cv.pdf
```

### "File too large" error

**Solution**: Compress the PDF or use a simpler CV

```bash
# Check file size (should be < 5MB)
ls -lh test-fixtures/sample-cv.pdf
```

### Tests can't upload file

**Solution**: Check file permissions

```bash
chmod 644 test-fixtures/sample-cv.pdf
```

## Next Steps

1. ✅ Create or place your `sample-cv.pdf` in this directory
2. ✅ Verify the file exists: `ls test-fixtures/sample-cv.pdf`
3. ✅ Run the tests: `bash scripts/test-tailor-cv.sh`
4. ✅ Review test reports in `.mycontext/test-reports/`

---

**Need Help?**

If you encounter issues with test fixtures:
1. Check this README
2. Verify file paths and names match exactly
3. Ensure file permissions are correct
4. Check the test execution logs for specific errors

**Pro Tip**: Run tests with `--headless=false` to watch the AI interact with the application and see exactly what's happening!
