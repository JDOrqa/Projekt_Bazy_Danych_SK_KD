import {
  FishingGround,
  FishSpecies,
  FishingMethod,
  Bait,
  FishingSession,
  CaughtFish,
  MonitoringStation,
  CatchLimit,
  Role,
  Permission
} from '../types';

export const mockFishingGrounds: FishingGround[] = [
  {
    id: '1',
    name: 'Jezioro Śniardwy',
    type: 'lake',
    areaHa: 113.8,
    maxDepth: 23,
    description: 'Największe jezioro w Polsce, bogate w ryby. Popularne gatunki: szczupak, sandacz, okoń, leszcz.',
    ownerId: '1',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Wisła - Warszawa',
    type: 'river',
    areaHa: 15.5,
    maxDepth: 8,
    description: 'Odcinek Wisły w rejonie Warszawy. Dobre łowisko na suma, leszcza i bolenia.',
    ownerId: '1',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20')
  },
  {
    id: '3',
    name: 'Staw Górski',
    type: 'pond',
    areaHa: 2.3,
    maxDepth: 4,
    description: 'Mały staw hodowlany. Regularnie zarybiany karpiem, amur i tołpygą.',
    ownerId: '1',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10')
  },
  {
    id: '4',
    name: 'Zalew Zegrzyński',
    type: 'reservoir',
    areaHa: 33.0,
    maxDepth: 12,
    description: 'Duży zalew na rzece Narwi. Doskonałe łowisko szczupaka i sandacza.',
    ownerId: '1',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05')
  }
];

export const mockSpecies: FishSpecies[] = [
  { id: '1', polishName: 'Szczupak', latinName: 'Esox lucius', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', polishName: 'Okoń', latinName: 'Perca fluviatilis', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', polishName: 'Karp', latinName: 'Cyprinus carpio', createdAt: new Date(), updatedAt: new Date() },
  { id: '4', polishName: 'Sandacz', latinName: 'Sander lucioperca', createdAt: new Date(), updatedAt: new Date() },
  { id: '5', polishName: 'Leszcz', latinName: 'Abramis brama', createdAt: new Date(), updatedAt: new Date() },
  { id: '6', polishName: 'Sum', latinName: 'Silurus glanis', createdAt: new Date(), updatedAt: new Date() },
  { id: '7', polishName: 'Amur', latinName: 'Ctenopharyngodon idella', createdAt: new Date(), updatedAt: new Date() },
  { id: '8', polishName: 'Pstrąg', latinName: 'Salmo trutta', createdAt: new Date(), updatedAt: new Date() },
];

export const mockMethods: FishingMethod[] = [
  { id: '1', name: 'Spinning', description: 'Łowienie na sztuczne przynęty' },
  { id: '2', name: 'Gruntówka', description: 'Łowienie dennym sprzętem' },
  { id: '3', name: 'Spławik', description: 'Łowienie ze spławikiem' },
  { id: '4', name: 'Muchówka', description: 'Łowienie na sztuczną muchę' },
  { id: '5', name: 'Trolling', description: 'Łowienie z poruszającej się łodzi' },
  { id: '6', name: 'Jig', description: 'Łowienie na gumowe przynęty' },
];

export const mockBaits: Bait[] = [
  { id: '1', name: 'Wobler', description: 'Sztuczna przynęta naśladująca rybkę' },
  { id: '2', name: 'Błystka', description: 'Metalowa błyszcząca przynęta' },
  { id: '3', name: 'Guma', description: 'Miękka przynęta silikonowa' },
  { id: '4', name: 'Robak', description: 'Naturalna przynęta - robaki' },
  { id: '5', name: 'Kukurydza', description: 'Przynęta roślinna' },
  { id: '6', name: 'Pellet', description: 'Granulowane kulki proteinowe' },
  { id: '7', name: 'Boiles', description: 'Kulki proteinowe na karpia' },
  { id: '8', name: 'Mucha', description: 'Sztuczna mucha' },
];

export const mockSessions: FishingSession[] = [
  {
    id: '1',
    userId: '1',
    groundId: '1',
    startTime: new Date('2026-04-01T08:00:00'),
    endTime: new Date('2026-04-01T14:30:00'),
    notes: 'Świetna sesja rano, dobra pogoda',
    catches: [],
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01')
  },
  {
    id: '2',
    userId: '1',
    groundId: '2',
    startTime: new Date('2026-04-05T06:00:00'),
    endTime: new Date('2026-04-05T12:00:00'),
    notes: 'Wiało mocno, ale były brania',
    catches: [],
    createdAt: new Date('2026-04-05'),
    updatedAt: new Date('2026-04-05')
  }
];

export const mockStations: MonitoringStation[] = [
  {
    id: '1',
    groundId: '1',
    name: 'Stacja Śniardwy Północ',
    location: { lat: 53.7833, lng: 21.7167 },
    sensorTypes: ['temperature', 'oxygen', 'ph'],
    lastSeen: new Date('2026-04-08T10:00:00'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2026-04-08')
  }
];

export const mockLimits: CatchLimit[] = [
  {
    id: '1',
    groundId: '1',
    speciesId: '1',
    minSizeCm: 50,
    dailyLimit: 3,
    protectionSeasonStart: new Date('2026-01-01'),
    protectionSeasonEnd: new Date('2026-04-30'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    groundId: '1',
    speciesId: '4',
    minSizeCm: 45,
    dailyLimit: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Wędkarz',
    description: 'Podstawowy użytkownik systemu',
    permissions: []
  },
  {
    id: '2',
    name: 'Właściciel Łowiska',
    description: 'Zarządzający łowiskami',
    permissions: []
  },
  {
    id: '3',
    name: 'Weryfikator',
    description: 'Weryfikujący zdjęcia i pomiary',
    permissions: []
  },
  {
    id: '4',
    name: 'Administrator',
    description: 'Pełne uprawnienia systemowe',
    permissions: []
  }
];

export const mockStats = {
  totalSessions: 24,
  totalCatches: 87,
  lastActivity: '2026-04-05',
  popularSpecies: [
    { name: 'Szczupak', count: 23 },
    { name: 'Okoń', count: 19 },
    { name: 'Karp', count: 15 },
    { name: 'Sandacz', count: 12 },
    { name: 'Leszcz', count: 10 },
    { name: 'Inne', count: 8 }
  ],
  activityByMonth: [
    { month: 'Sty', sessions: 2 },
    { month: 'Lut', sessions: 3 },
    { month: 'Mar', sessions: 5 },
    { month: 'Kwi', sessions: 4 }
  ]
};
