const DRIVERS = [
  {
    "driverId": 1,
    "name": "Ross Chastain",
    "lastName": "Chastain",
    "number": 1,
    "chartered": true,
    "skill": 78
  },
  {
    "driverId": 2,
    "name": "Austin Cindric",
    "lastName": "Cindric",
    "number": 2,
    "chartered": true,
    "skill": 75
  },
  {
    "driverId": 3,
    "name": "Austin Dillon",
    "lastName": "Dillon",
    "number": 3,
    "chartered": true,
    "skill": 66
  },
  {
    "driverId": 4,
    "name": "Noah Gragson",
    "lastName": "Gragson",
    "number": 4,
    "chartered": true,
    "skill": 62
  },
  {
    "driverId": 5,
    "name": "Kyle Larson",
    "lastName": "Larson",
    "number": 5,
    "chartered": true,
    "skill": 90
  },
  {
    "driverId": 6,
    "name": "Brad Keselowski",
    "lastName": "Keselowski",
    "number": 6,
    "chartered": true,
    "skill": 83
  },
  {
    "driverId": 7,
    "name": "Daniel Suarez",
    "lastName": "Suarez",
    "number": 7,
    "chartered": true,
    "skill": 56
  },
  {
    "driverId": 8,
    "name": "Chase Elliott",
    "lastName": "Elliott",
    "number": 9,
    "chartered": true,
    "skill": 89
  },
  {
    "driverId": 9,
    "name": "Ty Dillon",
    "lastName": "T. Dillon",
    "number": 10,
    "chartered": true,
    "skill": 60
  },
  {
    "driverId": 10,
    "name": "Denny Hamlin",
    "lastName": "Hamlin",
    "number": 11,
    "chartered": true,
    "skill": 99
  },
  {
    "driverId": 11,
    "name": "Ryan Blaney",
    "lastName": "Blaney",
    "number": 12,
    "chartered": true,
    "skill": 95
  },
  {
    "driverId": 12,
    "name": "AJ Allmendinger",
    "lastName": "Allmendinger",
    "number": 16,
    "chartered": true,
    "skill": 71
  },
  {
    "driverId": 13,
    "name": "Chris Buescher",
    "lastName": "Buescher",
    "number": 17,
    "chartered": true,
    "skill": 86
  },
  {
    "driverId": 14,
    "name": "Chase Briscoe",
    "lastName": "Briscoe",
    "number": 19,
    "chartered": true,
    "skill": 87
  },
  {
    "driverId": 15,
    "name": "Christopher Bell",
    "lastName": "Bell",
    "number": 20,
    "chartered": true,
    "skill": 91
  },
  {
    "driverId": 16,
    "name": "Josh Berry",
    "lastName": "Berry",
    "number": 21,
    "chartered": true,
    "skill": 68
  },
  {
    "driverId": 17,
    "name": "Joey Logano",
    "lastName": "Logano",
    "number": 22,
    "chartered": true,
    "skill": 87
  },
  {
    "driverId": 18,
    "name": "Bubba Wallace",
    "lastName": "Wallace",
    "number": 23,
    "chartered": true,
    "skill": 86
  },
  {
    "driverId": 19,
    "name": "William Byron",
    "lastName": "Byron",
    "number": 24,
    "chartered": true,
    "skill": 86
  },
  {
    "driverId": 20,
    "name": "Austin Hill",
    "lastName": "Hill",
    "number": 33,
    "chartered": true,
    "skill": 61
  },
  {
    "driverId": 21,
    "name": "Todd Gilliland",
    "lastName": "Gilliland",
    "number": 34,
    "chartered": true,
    "skill": 69
  },
  {
    "driverId": 22,
    "name": "Riley Herbst",
    "lastName": "Herbst",
    "number": 35,
    "chartered": true,
    "skill": 64
  },
  {
    "driverId": 23,
    "name": "Zane Smith",
    "lastName": "Smith",
    "number": 38,
    "chartered": true,
    "skill": 73
  },
  {
    "driverId": 24,
    "name": "Cole Custer",
    "lastName": "Custer",
    "number": 41,
    "chartered": true,
    "skill": 62
  },
  {
    "driverId": 25,
    "name": "John Hunter Nemechek",
    "lastName": "Nemechek",
    "number": 42,
    "chartered": true,
    "skill": 68
  },
  {
    "driverId": 26,
    "name": "Erik Jones",
    "lastName": "Jones",
    "number": 43,
    "chartered": true,
    "skill": 77
  },
  {
    "driverId": 27,
    "name": "Tyler Reddick",
    "lastName": "Reddick",
    "number": 45,
    "chartered": true,
    "skill": 92
  },
  {
    "driverId": 28,
    "name": "Ricky Stenhouse Jr.",
    "lastName": "Stenhouse Jr.",
    "number": 47,
    "chartered": true,
    "skill": 69
  },
  {
    "driverId": 29,
    "name": "Alex Bowman",
    "lastName": "Bowman",
    "number": 48,
    "chartered": true,
    "skill": 77
  },
  {
    "driverId": 30,
    "name": "Cody Ware",
    "lastName": "Ware",
    "number": 51,
    "chartered": true,
    "skill": 52
  },
  {
    "driverId": 31,
    "name": "Ty Gibbs",
    "lastName": "Gibbs",
    "number": 54,
    "chartered": true,
    "skill": 90
  },
  {
    "driverId": 32,
    "name": "Ryan Preece",
    "lastName": "Preece",
    "number": 60,
    "chartered": true,
    "skill": 75
  },
  {
    "driverId": 33,
    "name": "Michael McDowell",
    "lastName": "McDowell",
    "number": 71,
    "chartered": true,
    "skill": 73
  },
  {
    "driverId": 34,
    "name": "Carson Hocevar",
    "lastName": "Hocevar",
    "number": 77,
    "chartered": true,
    "skill": 82
  },
  {
    "driverId": 35,
    "name": "Connor Zilisch",
    "lastName": "Zilisch",
    "number": 88,
    "chartered": true,
    "skill": 65
  },
  {
    "driverId": 36,
    "name": "Shane van Gisbergen",
    "lastName": "van Gisbergen",
    "number": 97,
    "chartered": true,
    "skill": 75
  },
  {
    "driverId": 38,
    "name": "Justin Allgaier",
    "lastName": "Allgaier",
    "number": 40,
    "chartered": false,
    "skill": 77
  },
  {
    "driverId": 39,
    "name": "JJ Yeley",
    "lastName": "Yeley",
    "number": 44,
    "chartered": false,
    "skill": 45
  },
  {
    "driverId": 41,
    "name": "Corey Heim",
    "lastName": "Heim",
    "number": 67,
    "chartered": false,
    "skill": 60
  },
  {
    "driverId": 42,
    "name": "Jimmie Johnson",
    "lastName": "Johnson",
    "number": 84,
    "chartered": false,
    "skill": 54
  },
  {
    "driverId": 43,
    "name": "Kevin Magnussen",
    "lastName": "Magnussen",
    "number": 91,
    "chartered": false,
    "skill": 52
  },
  {
    "driverId": 44,
    "name": "Corey Lajoie",
    "lastName": "Lajoie",
    "number": 99,
    "chartered": false,
    "skill": 79
  }
];
