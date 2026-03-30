export interface ScripturePair {
  reference: string;
  text: string;
}

export const SCRIPTURE_PAIRS: ScripturePair[] = [
  {
    reference: "Psalm 83:18",
    text: "That people may know that you, whose name is Jehovah, you alone are the Most High over all the earth.",
  },
  {
    reference: "Proverbs 3:5, 6",
    text: "Trust in Jehovah with all your heart, and do not rely on your own understanding.",
  },
  {
    reference: "Isaiah 41:10",
    text: "Do not be afraid, for I am with you. Do not be anxious, for I am your God.",
  },
  {
    reference: "Matthew 6:9, 10",
    text: "Our Father in the heavens, let your name be sanctified. Let your Kingdom come.",
  },
  {
    reference: "John 17:3",
    text: "This means everlasting life, their coming to know you, the only true God, and the one whom you sent, Jesus Christ.",
  },
  {
    reference: "Romans 15:4",
    text: "For all the things that were written beforehand were written for our instruction.",
  },
  {
    reference: "2 Timothy 3:16",
    text: "All Scripture is inspired of God and beneficial for teaching, for reproving, for setting things straight.",
  },
  {
    reference: "Revelation 21:4",
    text: "He will wipe out every tear from their eyes, and death will be no more.",
  },
  {
    reference: "Psalm 37:10, 11",
    text: "Just a little while longer, and the wicked will be no more. But the meek will possess the earth.",
  },
  {
    reference: "Isaiah 55:11",
    text: "My word that goes out of my mouth will not return to me without results.",
  },
  {
    reference: "Philippians 4:6, 7",
    text: "Do not be anxious over anything, but in everything by prayer and supplication along with thanksgiving, let your petitions be made known to God.",
  },
  {
    reference: "Hebrews 10:24, 25",
    text: "Let us consider one another so as to incite to love and fine works, not forsaking our meeting together.",
  },
  {
    reference: "Matthew 24:14",
    text: "This good news of the Kingdom will be preached in all the inhabited earth for a witness to all the nations.",
  },
  {
    reference: "Joshua 1:9",
    text: "Be courageous and strong. Do not be struck with terror or fear, for Jehovah your God is with you.",
  },
  {
    reference: "Psalm 46:1",
    text: "God is our refuge and strength, a help that is readily found in times of distress.",
  },
  {
    reference: "James 4:8",
    text: "Draw close to God, and he will draw close to you.",
  },
];

export function getRandomPairs(count: number): ScripturePair[] {
  const shuffled = [...SCRIPTURE_PAIRS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
