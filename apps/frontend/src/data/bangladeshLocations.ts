export interface BangladeshDivision {
  id: string;
  nameEn: string;
  nameBn: string;
  lat: number;
  lng: number;
}

export interface BangladeshDistrict {
  id: string;
  nameEn: string;
  nameBn: string;
  divisionId: string;
}

export interface CommercialHub {
  id: string;
  nameBn: string;
  nameEn: string;
  areaBn: string;
  districtBn: string;
  divisionId: string;
  tag: string;
  lat: number;
  lng: number;
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা বিভাগ', lat: 23.8103, lng: 90.4125 },
  { id: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম বিভাগ', lat: 22.3569, lng: 91.7832 },
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট বিভাগ', lat: 24.8949, lng: 91.8687 },
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী বিভাগ', lat: 24.3636, lng: 88.6241 },
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা বিভাগ', lat: 22.8456, lng: 89.5403 },
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল বিভাগ', lat: 22.701, lng: 90.3535 },
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর বিভাগ', lat: 25.7439, lng: 89.2752 },
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ বিভাগ', lat: 24.7471, lng: 90.4203 },
];

export const BANGLADESH_DISTRICTS: BangladeshDistrict[] = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা', divisionId: 'dhaka' },
  { id: 'faridpur', nameEn: 'Faridpur', nameBn: 'ফরিদপুর', divisionId: 'dhaka' },
  { id: 'gazipur', nameEn: 'Gazipur', nameBn: 'গাজীপুর', divisionId: 'dhaka' },
  { id: 'gopalganj', nameEn: 'Gopalganj', nameBn: 'গোপালগঞ্জ', divisionId: 'dhaka' },
  { id: 'kishoreganj', nameEn: 'Kishoreganj', nameBn: 'কিশোরগঞ্জ', divisionId: 'dhaka' },
  { id: 'madaripur', nameEn: 'Madaripur', nameBn: 'মাদারীপুর', divisionId: 'dhaka' },
  { id: 'manikganj', nameEn: 'Manikganj', nameBn: 'মানিকগঞ্জ', divisionId: 'dhaka' },
  { id: 'munshiganj', nameEn: 'Munshiganj', nameBn: 'মুন্সীগঞ্জ', divisionId: 'dhaka' },
  { id: 'narayanganj', nameEn: 'Narayanganj', nameBn: 'নারায়ণগঞ্জ', divisionId: 'dhaka' },
  { id: 'narsingdi', nameEn: 'Narsingdi', nameBn: 'নরসিংদী', divisionId: 'dhaka' },
  { id: 'rajbari', nameEn: 'Rajbari', nameBn: 'রাজবাড়ী', divisionId: 'dhaka' },
  { id: 'shariatpur', nameEn: 'Shariatpur', nameBn: 'শরীয়তপুর', divisionId: 'dhaka' },
  { id: 'tangail', nameEn: 'Tangail', nameBn: 'টাঙ্গাইল', divisionId: 'dhaka' },
  { id: 'bandarban', nameEn: 'Bandarban', nameBn: 'বান্দরবান', divisionId: 'chattogram' },
  { id: 'brahmanbaria', nameEn: 'Brahmanbaria', nameBn: 'ব্রাহ্মণবাড়িয়া', divisionId: 'chattogram' },
  { id: 'chandpur', nameEn: 'Chandpur', nameBn: 'চাঁদপুর', divisionId: 'chattogram' },
  { id: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', divisionId: 'chattogram' },
  { id: 'cumilla', nameEn: 'Cumilla', nameBn: 'কুমিল্লা', divisionId: 'chattogram' },
  { id: 'coxsbazar', nameEn: "Cox's Bazar", nameBn: 'কক্সবাজার', divisionId: 'chattogram' },
  { id: 'feni', nameEn: 'Feni', nameBn: 'ফেনী', divisionId: 'chattogram' },
  { id: 'khagrachhari', nameEn: 'Khagrachhari', nameBn: 'খাগড়াছড়ি', divisionId: 'chattogram' },
  { id: 'lakshmipur', nameEn: 'Lakshmipur', nameBn: 'লক্ষ্মীপুর', divisionId: 'chattogram' },
  { id: 'noakhali', nameEn: 'Noakhali', nameBn: 'নোয়াখালী', divisionId: 'chattogram' },
  { id: 'rangamati', nameEn: 'Rangamati', nameBn: 'রাঙ্গামাটি', divisionId: 'chattogram' },
  { id: 'bogura', nameEn: 'Bogura', nameBn: 'বগুড়া', divisionId: 'rajshahi' },
  { id: 'joypurhat', nameEn: 'Joypurhat', nameBn: 'জয়পুরহাট', divisionId: 'rajshahi' },
  { id: 'naogaon', nameEn: 'Naogaon', nameBn: 'নওগাঁ', divisionId: 'rajshahi' },
  { id: 'natore', nameEn: 'Natore', nameBn: 'নাটোর', divisionId: 'rajshahi' },
  { id: 'chapainawabganj', nameEn: 'Chapainawabganj', nameBn: 'চাঁপাইনবাবগঞ্জ', divisionId: 'rajshahi' },
  { id: 'pabna', nameEn: 'Pabna', nameBn: 'পাবনা', divisionId: 'rajshahi' },
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী', divisionId: 'rajshahi' },
  { id: 'sirajganj', nameEn: 'Sirajganj', nameBn: 'সিরাজগঞ্জ', divisionId: 'rajshahi' },
  { id: 'bagerhat', nameEn: 'Bagerhat', nameBn: 'বাগেরহাট', divisionId: 'khulna' },
  { id: 'chuadanga', nameEn: 'Chuadanga', nameBn: 'চুয়াডাঙ্গা', divisionId: 'khulna' },
  { id: 'jashore', nameEn: 'Jashore', nameBn: 'যশোর', divisionId: 'khulna' },
  { id: 'jhenaidah', nameEn: 'Jhenaidah', nameBn: 'ঝিনাইদহ', divisionId: 'khulna' },
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা', divisionId: 'khulna' },
  { id: 'kushtia', nameEn: 'Kushtia', nameBn: 'কুষ্টিয়া', divisionId: 'khulna' },
  { id: 'magura', nameEn: 'Magura', nameBn: 'মাগুরা', divisionId: 'khulna' },
  { id: 'meherpur', nameEn: 'Meherpur', nameBn: 'মেহেরপুর', divisionId: 'khulna' },
  { id: 'narail', nameEn: 'Narail', nameBn: 'নড়াইল', divisionId: 'khulna' },
  { id: 'satkhira', nameEn: 'Satkhira', nameBn: 'সাতক্ষীরা', divisionId: 'khulna' },
  { id: 'barguna', nameEn: 'Barguna', nameBn: 'বরগুনা', divisionId: 'barishal' },
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল', divisionId: 'barishal' },
  { id: 'bhola', nameEn: 'Bhola', nameBn: 'ভোলা', divisionId: 'barishal' },
  { id: 'jhalokati', nameEn: 'Jhalokati', nameBn: 'ঝালকাঠি', divisionId: 'barishal' },
  { id: 'patuakhali', nameEn: 'Patuakhali', nameBn: 'পটুয়াখালী', divisionId: 'barishal' },
  { id: 'pirojpur', nameEn: 'Pirojpur', nameBn: 'পিরোজপুর', divisionId: 'barishal' },
  { id: 'habiganj', nameEn: 'Habiganj', nameBn: 'হবিগঞ্জ', divisionId: 'sylhet' },
  { id: 'moulvibazar', nameEn: 'Moulvibazar', nameBn: 'মৌলভীবাজার', divisionId: 'sylhet' },
  { id: 'sunamganj', nameEn: 'Sunamganj', nameBn: 'সুনামগঞ্জ', divisionId: 'sylhet' },
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট', divisionId: 'sylhet' },
  { id: 'dinajpur', nameEn: 'Dinajpur', nameBn: 'দিনাজপুর', divisionId: 'rangpur' },
  { id: 'gaibandha', nameEn: 'Gaibandha', nameBn: 'গাইবান্ধা', divisionId: 'rangpur' },
  { id: 'kurigram', nameEn: 'Kurigram', nameBn: 'কুড়িগ্রাম', divisionId: 'rangpur' },
  { id: 'lalmonirhat', nameEn: 'Lalmonirhat', nameBn: 'লালমনিরহাট', divisionId: 'rangpur' },
  { id: 'nilphamari', nameEn: 'Nilphamari', nameBn: 'নীলফামারী', divisionId: 'rangpur' },
  { id: 'panchagarh', nameEn: 'Panchagarh', nameBn: 'পঞ্চগড়', divisionId: 'rangpur' },
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর', divisionId: 'rangpur' },
  { id: 'thakurgaon', nameEn: 'Thakurgaon', nameBn: 'ঠাকুরগাঁও', divisionId: 'rangpur' },
  { id: 'jamalpur', nameEn: 'Jamalpur', nameBn: 'জামালপুর', divisionId: 'mymensingh' },
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ', divisionId: 'mymensingh' },
  { id: 'netrokona', nameEn: 'Netrokona', nameBn: 'নেত্রকোণা', divisionId: 'mymensingh' },
  { id: 'sherpur', nameEn: 'Sherpur', nameBn: 'শেরপুর', divisionId: 'mymensingh' },
];

export const POPULAR_COMMERCIAL_HUBS: CommercialHub[] = [
  // Dhaka Commercial & Wholesale Hubs
  { id: 'dhaka-keraniganj', nameBn: 'কেরানীগঞ্জ গার্মেন্টস আড়ত', nameEn: 'Keraniganj Garments Hub', areaBn: 'কেরানীগঞ্জ', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'পোশাক পাইকারি', lat: 23.6844, lng: 90.3789 },
  { id: 'dhaka-islampur', nameBn: 'ইসলামপুর থান কাপড় মার্কেট', nameEn: 'Islampur Fabric Market', areaBn: 'ইসলামপুর', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'টেক্সটাইল পাইকারি', lat: 23.7089, lng: 90.4042 },
  { id: 'dhaka-chawkbazar', nameBn: 'চকবাজার পাইকারি মার্কেট', nameEn: 'Chawkbazar Wholesale Market', areaBn: 'চকবাজার', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'কসমেটিক্স ও প্লাস্টিক', lat: 23.7161, lng: 90.3956 },
  { id: 'dhaka-babubazar', nameBn: 'বাবুবাজার চালের আড়ত', nameEn: 'Babubazar Rice Wholesale', areaBn: 'বাবুবাজার', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'খাদ্য ও আড়ত', lat: 23.71, lng: 90.402 },
  { id: 'dhaka-kawranbazar', nameBn: 'কারওয়ান বাজার কাঁচাবাজার আড়ত', nameEn: 'Kawran Bazar Produce Hub', areaBn: 'কারওয়ান বাজার', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'কাঁচামাল আড়ত', lat: 23.7516, lng: 90.3938 },
  { id: 'dhaka-motijheel', nameBn: 'মতিঝিল বাণিজ্যিক এলাকা', nameEn: 'Motijheel Commercial Area', areaBn: 'মতিঝিল', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'করপোরেট হাব', lat: 23.733, lng: 90.4172 },
  { id: 'dhaka-mirpur', nameBn: 'মিরপুর শপিং ও আবাসিক জোন', nameEn: 'Mirpur Hub', areaBn: 'মিরপুর-১০', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'হাইপারলোকাল জোন', lat: 23.807, lng: 90.3686 },
  { id: 'dhaka-uttara', nameBn: 'উত্তরা এয়ারপোর্ট জোন', nameEn: 'Uttara Hub', areaBn: 'উত্তরা', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'হাইপারলোকাল জোন', lat: 23.8759, lng: 90.3795 },
  { id: 'dhaka-gulshan', nameBn: 'গুলশান ও বনানী প্রিমিয়াম জোন', nameEn: 'Gulshan & Banani Zone', areaBn: 'গুলশান', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'লাইফস্টাইল জোন', lat: 23.7925, lng: 90.4078 },
  { id: 'dhaka-dhanmondi', nameBn: 'ধানমন্ডি লেক ও রিটেইল জোন', nameEn: 'Dhanmondi Retail Hub', areaBn: 'ধানমন্ডি', districtBn: 'ঢাকা', divisionId: 'dhaka', tag: 'খুচরা ও ক্যাফে', lat: 23.7465, lng: 90.376 },
  { id: 'dhaka-tongi', nameBn: 'টঙ্গী শিল্পাঞ্চল', nameEn: 'Tongi Industrial Area', areaBn: 'টঙ্গী', districtBn: 'গাজীপুর', divisionId: 'dhaka', tag: 'ফ্যাক্টরি ও মিলস', lat: 23.8967, lng: 90.4032 },
  { id: 'dhaka-narayanganj', nameBn: 'নারায়ণগঞ্জ নিটিং ও হোসিয়ারি', nameEn: 'Narayanganj Hosiery Hub', areaBn: 'নারায়ণগঞ্জ সদর', districtBn: 'নারায়ণগঞ্জ', divisionId: 'dhaka', tag: 'টেক্সটাইল মিলস', lat: 23.6238, lng: 90.5 },

  // Chattogram Commercial & Wholesale Hubs
  { id: 'ctg-khatunganj', nameBn: 'খাতুনগঞ্জ ভোগ্যপণ্য আড়ত', nameEn: 'Khatunganj Commodity Hub', areaBn: 'খাতুনগঞ্জ', districtBn: 'চট্টগ্রাম', divisionId: 'chattogram', tag: 'কমোডিটি আড়ত', lat: 22.3392, lng: 91.8384 },
  { id: 'ctg-agrabad', nameBn: 'আগ্রাবাদ কমার্শিয়াল এরিয়া', nameEn: 'Agrabad Commercial Area', areaBn: 'আগ্রাবাদ', districtBn: 'চট্টগ্রাম', divisionId: 'chattogram', tag: 'করপোরেট ও শিপিং', lat: 22.3275, lng: 91.8122 },
  { id: 'ctg-gec', nameBn: 'জিইসি ও নাসিরাবাদ জোন', nameEn: 'GEC & Nasirabad Zone', areaBn: 'জিইসি মোড়', districtBn: 'চট্টগ্রাম', divisionId: 'chattogram', tag: 'খুচরা মার্কেট', lat: 22.3591, lng: 91.8219 },

  // Sylhet Hubs
  { id: 'sylhet-zindabazar', nameBn: 'জিন্দাবাজার রিটেইল সেন্টার', nameEn: 'Zindabazar Retail Hub', areaBn: 'জিন্দাবাজার', districtBn: 'সিলেট', divisionId: 'sylhet', tag: 'সেন্ট্রাল মার্কেট', lat: 24.8978, lng: 91.8714 },

  // Rajshahi Hubs
  { id: 'raj-shaheb-bazar', nameBn: 'সাহেব বাজার সিল্ক ও কৃষি আড়ত', nameEn: 'Shaheb Bazar Silk & Agro Hub', areaBn: 'সাহেব বাজার', districtBn: 'রাজশাহী', divisionId: 'rajshahi', tag: 'সিল্ক ও আম আড়ত', lat: 24.3667, lng: 88.6 },

  // Khulna Hubs
  { id: 'khulna-daulatpur', nameBn: 'দৌলতপুর পাট ও কৃষি মোকাম', nameEn: 'Daulatpur Jute & Agro Hub', areaBn: 'দৌলতপুর', districtBn: 'খুলনা', divisionId: 'khulna', tag: 'পাট ও মৎস্য মোকাম', lat: 22.88, lng: 89.52 },

  // Barishal Hubs
  { id: 'bar-chowkbazar', nameBn: 'নথুল্লাবাদ ও চকবাজার আড়ত', nameEn: 'Nathullabad & Chawkbazar Hub', areaBn: 'চকবাজার', districtBn: 'বরিশাল', divisionId: 'barishal', tag: 'ধান ও নদী বন্দর', lat: 22.705, lng: 90.36 },

  // Rangpur Hubs
  { id: 'rang-jahaj-company', nameBn: 'জাহাজ কোম্পানি মোড় কমার্শিয়াল', nameEn: 'Jahaj Company More Hub', areaBn: 'জাহাজ কোম্পানি মোড়', districtBn: 'রংপুর', divisionId: 'rangpur', tag: 'বাণিজ্যিক এলাকা', lat: 25.748, lng: 89.25 },

  // Mymensingh Hubs
  { id: 'mym-ganginarpar', nameBn: 'গাঙ্গিনারপাড় প্রধান বাজার', nameEn: 'Ganginarpar Central Market', areaBn: 'গাঙ্গিনারপাড়', districtBn: 'ময়মনসিংহ', divisionId: 'mymensingh', tag: 'প্রধান বাজার', lat: 24.755, lng: 90.407 },
];
