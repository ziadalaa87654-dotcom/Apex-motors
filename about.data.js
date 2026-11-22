// ─── APEX MOTORS — Data Store ─────────────────────────────────────────────────

const timeline = [
  {
    id: "tl-1987",
    year: "1987",
    title: "The Beginning",
    description: "Started with 3 vehicles: a 1963 Ferrari 250 GTO, a Lamborghini Miura, and a Porsche 911 Carrera RS. Focus was pure: authenticity and provenance above all else.",
    order: 1,
  },
  {
    id: "tl-1991",
    year: "1991",
    title: "First Major Partnership",
    description: "Established direct partnerships with Ferrari factory. Became the trusted source for verified, low-mileage examples. Built reputation through meticulous documentation practices.",
    order: 2,
  },
  {
    id: "tl-1998",
    year: "1998",
    title: "International Recognition",
    description: "Expanded to handle ultra-rare vehicles: Rolls-Royce, Bentley, and Aston Martin acquisitions. Started consulting with collectors worldwide. Implemented the proprietary 217-point inspection process.",
    order: 3,
  },
  {
    id: "tl-2007",
    year: "2007",
    title: "Crisis & Evolution",
    description: "During financial crisis, APEX thrived by focusing on genuine discretionary luxury. While others struggled, our client base expanded due to reputation for guaranteed authenticity and stability.",
    order: 4,
  },
  {
    id: "tl-2015",
    year: "2015",
    title: "Digital Transformation",
    description: "Introduced AI-powered vehicle authentication. Invested in advanced restoration facilities. Pioneered virtual viewing experience for international clients preparing acquisitions.",
    order: 5,
  },
  {
    id: "tl-2020",
    year: "2020–2024",
    title: "Modern Luxury",
    description: "Integrated hybrid and electric supercars. Expanded bespoke customization. Established heritage restoration division. Now serving 4th-generation family collectors while maintaining founding principles.",
    order: 6,
  },
];

const stories = [
  {
    id: "story-gto",
    title: "The 250 GTO Recovery",
    text: "In 1992, Marcus tracked down a stolen 1962 Ferrari 250 GTO for three years and successfully recovered it for its original family. This defining moment established our reputation for ethical operation and passion for automotive history.",
    order: 1,
  },
  {
    id: "story-network",
    title: "Global Collector Network",
    text: "Over three decades, we've established personal relationships with private collectors across six continents. These relationships have given us first access to vehicles that never reach public markets—vehicles with extraordinary provenance.",
    order: 2,
  },
  {
    id: "story-restoration",
    title: "The Restoration Masters",
    text: "Our technical team includes former factory technicians from Ferrari, Lamborghini, and Porsche. They've restored vehicles to concours condition, winning major international automobile exhibitions and setting auction records.",
    order: 3,
  },
];

const philosophy = [
  {
    id: "phil-authenticity",
    title: "Uncompromising Authenticity",
    description: "Every vehicle is verified for authenticity. We look beyond paperwork to understand the true story of ownership, maintenance, and mechanical integrity.",
    order: 1,
  },
  {
    id: "phil-excellence",
    title: "Technical Excellence",
    description: "Our 217-point inspection isn't checklist-based. It's a comprehensive diagnostic performed by masters who understand what separates a genuine collector's car from imitation.",
    order: 2,
  },
  {
    id: "phil-relationships",
    title: "Client Relationships First",
    description: "We're not transaction-focused. Our goal is to build lasting relationships with collectors who return over decades, often bringing their children and grandchildren.",
    order: 3,
  },
  {
    id: "phil-preservation",
    title: "Historical Preservation",
    description: "Each vehicle carries history. We preserve and document that history, ensuring future generations understand the provenance and significance of automotive heritage.",
    order: 4,
  },
];

const expertise = [
  {
    id: "exp-provenance",
    title: "Provenance Research",
    description: "Unrivalled ability to trace ownership histories, verify authenticity, and uncover the complete lineage of rare and exotic vehicles across global registries.",
    order: 1,
  },
  {
    id: "exp-technicians",
    title: "Master Technicians",
    description: "Factory-certified specialists from every major luxury brand with decades of hands-on expertise in exotic mechanics and restoration.",
    order: 2,
  },
  {
    id: "exp-market",
    title: "Market Intelligence",
    description: "Real-time knowledge of global collector trends, auction results, and upcoming releases from factory partnerships.",
    order: 3,
  },
  {
    id: "exp-finance",
    title: "Financial Structures",
    description: "Expert in navigating the complex world of exotic car financing, insurance, and asset management for ultra-high-net-worth individuals.",
    order: 4,
  },
  {
    id: "exp-logistics",
    title: "Logistics & Delivery",
    description: "Specialize in international shipping, customs clearance, and white-glove delivery for vehicles valued in the millions.",
    order: 5,
  },
];

const milestones = [
  { id: "ms-clients",  value: "2000+", label: "Clients Served",              order: 1 },
  { id: "ms-vehicles", value: "5000+", label: "Vehicles Authenticated",      order: 2 },
  { id: "ms-value",    value: "$2.8B+",label: "Total Transaction Value",     order: 3 },
  { id: "ms-years",    value: "39",    label: "Years of Unbroken Excellence", order: 4 },
];

module.exports = { timeline, stories, philosophy, expertise, milestones };
