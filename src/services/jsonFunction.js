import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src/json/LeadAssignMap.json");

export const readAssignmentConfig = () => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }

    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
};

export const writeAssignmentConfig = (data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};