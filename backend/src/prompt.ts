export const RESPONSE = `
[
  {
    "title": "COMP 1000 Key Concepts in Computer Scie",
    "start": "Tuesday 5:30 PM",
    "end": "Tuesday 6:50 PM",
    "instructors": ["Biswas"],
    "location": "Chrysler Hall North G133"
  },
    {
    "title": "COMP 1000 Key Concepts in Computer Scie",
    "start": "Tuesday 5:30 PM",
    "end": "Tuesday 6:50 PM",
    "instructors": ["Biswas"],
    "location": "Chrysler Hall North G133"
  },
    {
    "title": "COMP 1000 Key Concepts in Computer Scie",
    "start": "Tuesday 5:30 PM",
    "end": "Tuesday 6:50 PM",
    "instructors": ["Biswas"],
    "location": "Chrysler Hall North G133"
  },
  {
    "title": "COMP 1000 Key Concepts in Computer Scie",
    "start": "Thursday 7:00 PM",
    "end": "Thursday 8:20 PM",
    "instructors": ["Biswas","ahmed"],
    "location": "Dillon Hall 359"
  },
  {
    "title": "COMP 1400 Intro: Algorithms & Prog I",
    "start": "Wednesday 7:00 PM",
    "end": "Wednesday 9:50 PM",
    "instructors": null,
    "location": "Odette Building 104"
  },
  {
    "title": "COMP 1400 Intro: Algorithms & Prog I",
    "start": "Monday 10:00 AM",
    "end": "Monday 11:20 AM",
    "instructors": null,
    "location": "West Library 305C"
  },
  {
    "title": "COMP 1410 Intro: Algorithms & Prog II",
    "start": "Thursday 8:30 PM",
    "end": "Thursday 9:50 PM",
    "instructors": null,
    "location": "West Library 305C"
  },
  {
    "title": "COMP 1410 Intro: Algorithms & Prog II",
    "start": "Tuesday 7:00 PM",
    "end": "Tuesday 9:50 PM",
    "instructors": null,
    "location": "Erie Hall 3123"
  },
  {
    "title": "STAT 2920 Introduction to Probability",
    "start": "Monday 11:30 AM",
    "end": "Monday 12:50 PM",
    "instructors": null,
    "location": "Erie Hall 3123"
  },
  {
    "title": "STAT 2920 Introduction to Probability",
    "start": "Friday 8:30 AM",
    "end": "Friday 9:20 AM",
    "instructors": null,
    "location": "Toldo Health Education Ctr 104"
  }
]
`;
export const GET_SCHEDULE_PROMPT_SHORT = `
I will give you a list of classes each with their start time, end time, location, and instructors. Your task is to process any given input and convert it into the specified JSON format below. Use 'null' for any missing properties and ignore any extra properties. Always adhere to this format regardless of input inconsistencies or unclear data.

OUTPUT
[
  {
    "title": "Chemistry",
    "start": "Monday 10:00 AM",
    "end": "Monday 11:00 AM",
    "instructors": ["Anko Mitarashi"],
    "location": "CEI 1101"
  },
  {
    "title": "Math",
    "start": "Thursday 12:00 PM",
    "end": "Thursday 1:00 PM",
    "instructors": ["Maryam Nawaz"],
    "location": "Eng 7 Rm.1101"
  },
  {
    "title": "Chemistry Lab",
    "start": "Tuesday 4:00 PM",
    "end": "Tuesday 7:00 PM",
    "instructors": ["Ryan Butair", "Nihar Biswas"],
    "location": "Leddy Library Room 3004"
  }
]

INPUT
`;

export const GET_SCHEDULE_PROMPT = `
I will give you a list of classes each with their start time, end time, location and instructors. 
The input may not perfectly align with this structure. I want you to try your best and process 
the input and output them in the specified format. Do not deviate from
this format. Do not output anything else. Even if the input is unclear or missing certain properties
or contains extra properties, adhere to this output format and use null for missing properties. Below
is the format. The actual input is followed by the word "INPUT" below.

OUTPUT
[
  {
    "title": "Chemistry",
    "start": "Monday 10:00 AM",
    "end": "Monday 11:00 AM",
    "instructors": ["Anko Mitarashi"],
    "location": "CEI 1101"
  },
  {
    "title": "Math",
    "start": "Thursday 12:00 PM",
    "end": "Thursday 1:00 PM",
    "instructors": ["Maryam Nawaz"],
    "location": "Eng 7 Rm.1101"
  },
  {
    "title": "Chemistry Lab",
    "start": "Tuesday 4:00 PM",
    "end": "Tuesday 7:00 PM",
    "instructors": ["Ryan Butair", "Nihar Biswas"],
    "location": "Leddy Library Room 3004"
  }
]

INPUT
`;

export const USER_INPUT = `
COMP 1000 Key Concepts in Computer Scie
Status
	
Units
	
Grading Basis
	
Grade
	
Academic Program
	
Requirement Designation
	
	
	
	
	
Enrolled
	
3.00
	
Graded
	
 
	
Bach of Applied Sci Elec Eng
	
 
Class
	
Start/End Dates
	
Days and Times
	
Room
	
LEC - Class Sect 2 - Class Nbr 2543
	
05/09/2024 - 04/12/2024
 
	
Days: Tuesday Thursday
Times: 5:30PM to 6:50PM
	
Chrysler Hall North G133
 
	
 
LAB - Class Sect 54 - Class Nbr 2547
	
05/09/2024 - 04/12/2024
 
	
Days: Thursday
Times: 7:00PM to 8:20PM
	
Dillon Hall 359
 
	
 
Enrollment Deadlines
COMP 1400 Intro: Algorithms & Prog I
Status
	
Units
	
Grading Basis
	
Grade
	
Academic Program
	
Requirement Designation
	
	
	
	
	
Enrolled
	
3.00
	
Graded
	
 
	
Bach of Applied Sci Elec Eng
	
 
Class
	
Start/End Dates
	
Days and Times
	
Room
	
LEC - Class Sect 30 - Class Nbr 2555
	
05/09/2024 - 04/12/2024
 
	
Days: Wednesday
Times: 7:00PM to 9:50PM
	
Odette Building 104
 
	
 
LAB - Class Sect 57 - Class Nbr 2562
	
05/09/2024 - 04/12/2024
 
	
Days: Monday
Times: 10:00AM to 11:20AM
	
West Library 305C
 
	
 
Enrollment Deadlines
COMP 1410 Intro: Algorithms & Prog II
Status
	
Units
	
Grading Basis
	
Grade
	
Academic Program
	
Requirement Designation
	
	
	
	
	
Enrolled
	
3.00
	
Graded
	
 
	
Bach of Applied Sci Elec Eng
	
 
Class
	
Start/End Dates
	
Days and Times
	
Room
	
LAB - Class Sect 52 - Class Nbr 2567
	
05/09/2024 - 04/12/2024
 
	
Days: Thursday
Times: 8:30PM to 9:50PM
	
West Library 305C
 
	
 
LEC - Class Sect 1 - Class Nbr 2883
	
05/09/2024 - 04/12/2024
 
	
Days: Tuesday
Times: 7:00PM to 9:50PM
	
Erie Hall 3123
 
	
 
Enrollment Deadlines
STAT 2920 Introduction to Probability
Status
	
Units
	
Grading Basis
	
Grade
	
Academic Program
	
Requirement Designation
	
	
	
	
	
Enrolled
	
3.00
	
Graded
	
 
	
Bach of Applied Sci Elec Eng
	
 
Class
	
Start/End Dates
	
Days and Times
	
Room
	
LEC - Class Sect 1 - Class Nbr 2718
	
05/09/2024 - 04/12/2024
 
	
Days: Monday Wednesday
Times: 11:30AM to 12:50PM
	
Erie Hall 3123
 
	
 
LAB - Class Sect 51 - Class Nbr 3145
	
05/09/2024 - 04/12/2024
 
	
Days: Friday
Times: 8:30AM to 9:20AM
	
Toldo Health Education Ctr 104
`;
