import fs from 'fs';
import path from 'path';

export interface Teacher {
  ipTTCGroup: string;
  rtc: string;
  timezone: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

function parseCSV(content: string): string[][] {
  // Strip BOM if present
  const cleaned = content.replace(/^﻿/, '');
  const rows: string[][] = [];

  for (const line of cleaned.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Escaped quote inside a quoted field
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }

  return rows;
}

export function fetchTeachers(): Teacher[] {
  const csvPath = path.join(process.cwd(), 'data', 'teachers.csv');

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      'teachers.csv not found. Export your Google Sheet as CSV and save it to data/teachers.csv'
    );
  }

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));

  // Row 0 is the header — skip it
  return rows.slice(1).map((row) => ({
    ipTTCGroup: row[0]  ?? '',
    rtc:        row[1]  ?? '',
    timezone:   row[2]  ?? '',
    firstName:  row[3]  ?? '',
    lastName:   row[4]  ?? '',
    phone:      row[5]  ?? '',
    email:      row[6]  ?? '',
    city:       row[7]  ?? '',
    state:      row[8]  ?? '',
    country:    row[9]  ?? '',
    zip:        row[10] ?? '',
  }));
}
