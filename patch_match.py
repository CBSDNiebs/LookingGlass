import re

with open("src/components/ObservationFlow.tsx", "r") as f:
    content = f.read()

new_match_logic = """
        let selectedSchool = 'Unknown School';
        // Look up school by matching the educator name dynamically
        const searchName = payload.educatorName.toLowerCase().trim();
        const searchParts = searchName.split(/\\s+|,\\s*/);
        
        let exactMatch = dbStaff.find(s => s.name.toLowerCase() === searchName);
        
        if (!exactMatch && searchParts.length >= 2) {
          // Try to match "First Last" against "Last, First"
          exactMatch = dbStaff.find(s => {
            const dbName = s.name.toLowerCase();
            return dbName.includes(searchParts[0]) && dbName.includes(searchParts[searchParts.length - 1]);
          });
        }
        
        if (exactMatch) {
          selectedSchool = exactMatch.school;
        }
"""

content = re.sub(
    r"let selectedSchool = 'Unknown School';[\s\S]*?if \(exactMatch\) {[\s\S]*?selectedSchool = exactMatch\.school;[\s\S]*?}",
    new_match_logic,
    content
)

with open("src/components/ObservationFlow.tsx", "w") as f:
    f.write(content)
