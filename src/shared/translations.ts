export const translations = {
  th: {
    // Common
    loading: 'กำลังโหลด...',
    errorConnection: 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง',
    
    // Login
    loginTitle: 'เข้าสู่ระบบ ServiceOS',
    loginSubtitle: 'ระบบจัดการคิวและบริการอัจฉริยะ',
    emailLabel: 'อีเมล',
    passwordLabel: 'รหัสผ่าน',
    loginButton: 'เข้าสู่ระบบ',
    googleSignIn: 'เข้าสู่ระบบด้วย Google',
    forgotPasswordLink: 'ลืมรหัสผ่าน?',
    noAccount: 'ยังไม่มีบัญชีผู้ใช้งาน?',
    signUpLink: 'สมัครสมาชิกที่นี่',
    
    // Signup
    signupTitle: 'สร้างบัญชี ServiceOS',
    signupSubtitle: 'เริ่มต้นการทำงานของระบบคิวอัจฉริยะ',
    nameLabel: 'ชื่อ - นามสกุล',
    confirmPasswordLabel: 'ยืนยันรหัสผ่าน',
    signupButton: 'สมัครสมาชิก',
    googleSignUp: 'สมัครใช้งานด้วย Google',
    alreadyHaveAccount: 'มีบัญชีผู้ใช้งานอยู่แล้ว?',
    loginLink: 'เข้าสู่ระบบที่นี่',
    
    // Forgot Password
    forgotPasswordTitle: 'กู้คืนรหัสผ่าน',
    forgotPasswordSubtitle: 'ป้อนอีเมลของคุณเพื่อรับลิงก์กู้คืนรหัสผ่าน',
    resetButton: 'ส่งลิงก์กู้คืนรหัสผ่าน',
    backToLogin: 'กลับไปหน้าเข้าสู่ระบบ',
    resetSuccessTitle: 'ส่งอีเมลสำเร็จ!',
    resetSuccessMessage: 'เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณเรียบร้อยแล้ว',
    
    // Onboarding
    onboardingTitle: 'ยินดีต้อนรับสู่ ServiceOS',
    onboardingSubtitle: 'กรอกข้อมูลโปรไฟล์ธุรกิจของคุณ เพื่อเริ่มต้นสร้างระบบคิวและบอร์ดควบคุมสาขา',
    businessNameLabel: 'ชื่อธุรกิจ / ชื่อร้านค้า',
    businessNamePlaceholder: 'เช่น คลินิกรักดี, ร้านกาแฟสุขใจ',
    businessTypeLabel: 'ประเภทธุรกิจ',
    businessTypePlaceholder: 'กรุณาเลือกประเภทธุรกิจ',
    phoneLabel: 'เบอร์โทรศัพท์ติดต่อ',
    phonePlaceholder: 'เช่น 0812345678',
    timezoneLabel: 'เขตเวลาระบบ (Timezone)',
    submitOnboarding: 'สร้างพื้นที่ทำงานและถัดไป',
    logoutLink: 'ออกจากระบบ',
    switchAccount: 'เข้าสู่ระบบด้วยบัญชีอื่น?',
    
    // Business Types
    restaurant: 'ร้านอาหาร / คาเฟ่',
    clinic: 'คลินิก (การแพทย์ / เสริมความงาม)',
    salon: 'ร้านทำผม / เสริมสวย / สปา',
    repair_shop: 'ร้านซ่อมบำรุง / อู่ซ่อมรถ',
    service_center: 'ศูนย์บริการลูกค้า / เคาน์เตอร์ประชาสัมพันธ์',

    // --- Dashboard & Navigation ---
    menuQueues: 'บอร์ดควบคุมคิว',
    menuAppointments: 'ตารางนัดหมาย',
    menuBranches: 'การจัดการสาขา',
    menuServices: 'การจัดการบริการ',
    menuStaff: 'รายชื่อพนักงาน',
    menuSettings: 'ตั้งค่าโปรไฟล์',
    logoutButton: 'ออกจากระบบ',
    timezonePrefix: 'เขตเวลา',
    rolePrefix: 'สิทธิ์',

    // --- Mock Landing Page ---
    landingTitle: 'ยินดีต้อนรับสู่ ServiceOS',
    landingSubtitle: 'โครงสร้างพื้นฐานระบบและระบบตรวจคิวบริการอัจฉริยะ',
    landingLoginBtn: 'เข้าสู่ระบบ',
    landingTryQRBtn: 'ทดลองสแกน QR เช็คอิน',

    // --- Mock QR Join ---
    qrJoinTitle: 'สแกน QR เช็คอิน',
    qrJoinSubtitle: 'สแกนคิวอาร์โค้ดประจำสาขาเพื่อรับบัตรคิวเข้าบริการ',
    activeBranchLabel: 'สาขาให้บริการ',
    mockBranchName: 'สำนักงานใหญ่ กรุงเทพฯ',
    mockJoinTicketBtn: 'จำลองการกดรับบัตรคิว',

    // --- Mock Ticket Status ---
    ticketStatusLabel: 'สถานะบัตรคิวของคุณ',
    peopleAheadLabel: 'มีอีก {count} คิวก่อนหน้าคุณ • รอประมาณ {mins} นาที',
    cancelTicketBtn: 'ยกเลิกบัตรคิว',
    ticketCancelledAlert: 'ยกเลิกบัตรคิวสำเร็จ',

    // --- Mock TV Display ---
    tvDisplayTitle: 'หน้าจอแสดงผลคิว',
    nowCallingLabel: 'กำลังเรียกคิว',
    proceedToCounterLabel: 'กรุณาติดต่อที่ช่องบริการ {counter}',
    waitingListLabel: 'รายการคิวรอเรียก',
    haveTicketReadyLabel: 'โปรดจัดเตรียมบัตรคิวของท่านให้พร้อม',

    // --- Mock Queues Console ---
    queueControlBoardTitle: 'บอร์ดควบคุมคิว',
    queueControlBoardSubtitle: 'เรียกคิวลูกค้า ถัดไปตามระบบ จัดการข้อมูลบริการ และตรวจสอบข้อมูลสถิติประจำวัน',
    callNextTicketBtn: 'เรียกคิวถัดไป',
    waitingCustomersLabel: 'ลูกค้าที่รอเรียก',
    activeServingLabel: 'กำลังให้บริการ',
    avgWaitTimeLabel: 'เวลารอเฉลี่ย',
    callNextActionTriggeredAlert: 'เริ่มเรียกคิวถัดไปแล้ว',

    // --- Mock Appointments ---
    appointmentScheduleTitle: 'ตารางการนัดหมาย',
    appointmentScheduleSubtitle: 'จัดการคิวนัดหมายของลูกค้าล่วงหน้า และเช็คอินเข้าบริการเมื่อลูกค้ามาถึง',
    appointmentPlaceholder: 'พื้นที่จำลองสำหรับแสดงปฏิทินและการจองคิวบริการ',

    // --- Mock Branches ---
    branchesTitle: 'การจัดการสาขา',
    branchesSubtitle: 'ตั้งค่าเวลาเปิดทำการ เขตเวลา และจอแสดงคิวประจำสาขาต่าง ๆ',
    branchesPlaceholder: 'พื้นที่จำลองสำหรับจัดการข้อมูลสาขา (สร้าง, อ่าน, แก้ไข, ลบ)',

    // --- Mock Services ---
    servicesTitle: 'การจัดการบริการ',
    servicesSubtitle: 'ตั้งค่าตัวอักษรนำหน้าคิว ฟิลด์ข้อมูลลูกค้าที่ต้องกรอก และเชื่อมโยงกระบวนการทำงาน',
    servicesPlaceholder: 'พื้นที่จำลองสำหรับจัดการประเภทและตัวเลือกบริการสาขา',

    // --- Mock Staff ---
    staffTitle: 'รายชื่อพนักงาน',
    staffSubtitle: 'เชิญทีมงานเข้าร่วมระบบ พร้อมกำหนดสิทธิ์และสาขาประจำการ',
    staffPlaceholder: 'พื้นที่จำลองสำหรับแสดงรายชื่อพนักงานและเครื่องมือจัดการสิทธิ์',

    // --- Mock Settings ---
    tenantSettingsTitle: 'ตั้งค่าโปรไฟล์และองค์กร',
    tenantSettingsSubtitle: 'จัดการรายละเอียดบริษัท ตั้งค่าสีตราสินค้า และระบบเรียกเก็บเงิน Stripe',
    settingsPlaceholder: 'พื้นที่จำลองสำหรับแสดงรายละเอียดการเป็นสมาชิกและระบบชำระเงิน',
  },
  en: {
    // Common
    loading: 'Loading...',
    errorConnection: 'Connection error. Please try again.',
    
    // Login
    loginTitle: 'Sign in to ServiceOS',
    loginSubtitle: 'Smart queue & service operating system',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    loginButton: 'Sign In',
    googleSignIn: 'Sign in with Google',
    forgotPasswordLink: 'Forgot password?',
    noAccount: "Don't have an account?",
    signUpLink: 'Sign up here',
    
    // Signup
    signupTitle: 'Create ServiceOS Account',
    signupSubtitle: 'Get started with the smart queue system',
    nameLabel: 'Full Name',
    confirmPasswordLabel: 'Confirm Password',
    signupButton: 'Create Account',
    googleSignUp: 'Sign up with Google',
    alreadyHaveAccount: 'Already have an account?',
    loginLink: 'Sign in here',
    
    // Forgot Password
    forgotPasswordTitle: 'Reset Password',
    forgotPasswordSubtitle: 'Enter your email to receive a password reset link',
    resetButton: 'Send Reset Link',
    backToLogin: 'Back to sign in',
    resetSuccessTitle: 'Email Sent!',
    resetSuccessMessage: 'We have sent a password reset link to your email address.',
    
    // Onboarding
    onboardingTitle: 'Welcome to ServiceOS',
    onboardingSubtitle: 'Set up your business profile to begin building your queues and dashboard.',
    businessNameLabel: 'Business / Shop Name',
    businessNamePlaceholder: 'e.g. Health Clinic, Cozy Coffee',
    businessTypeLabel: 'Business Type',
    businessTypePlaceholder: 'Please select your business type',
    phoneLabel: 'Contact Phone Number',
    phonePlaceholder: 'e.g. 0812345678',
    timezoneLabel: 'System Timezone',
    submitOnboarding: 'Create Workspace & Proceed',
    logoutLink: 'Sign Out',
    switchAccount: 'Sign in with a different account?',
    
    // Business Types
    restaurant: 'Restaurant / Cafe',
    clinic: 'Clinic (Medical / Aesthetic)',
    salon: 'Hair Salon / Beauty / Spa',
    repair_shop: 'Repair Shop / Garage',
    service_center: 'Customer Service / Info Counter',

    // --- Dashboard & Navigation ---
    menuQueues: 'Queues Control',
    menuAppointments: 'Appointments',
    menuBranches: 'Branches',
    menuServices: 'Services',
    menuStaff: 'Staff Directory',
    menuSettings: 'Tenant Profile',
    logoutButton: 'Log out',
    timezonePrefix: 'Timezone',
    rolePrefix: 'Role',

    // --- Mock Landing Page ---
    landingTitle: 'Welcome to ServiceOS',
    landingSubtitle: 'Scaffolding and smart service check-in queue system.',
    landingLoginBtn: 'Go to Login',
    landingTryQRBtn: 'Try QR Check-in',

    // --- Mock QR Join ---
    qrJoinTitle: 'QR Self Check-in',
    qrJoinSubtitle: 'Scan entrance QR code to secure your queue ticket.',
    activeBranchLabel: 'Active Branch',
    mockBranchName: 'Bangkok Main Office',
    mockJoinTicketBtn: 'Mock Join Ticket',

    // --- Mock Ticket Status ---
    ticketStatusLabel: 'Queue Status',
    peopleAheadLabel: '{count} person ahead of you • Est: {mins} mins',
    cancelTicketBtn: 'Cancel Ticket',
    ticketCancelledAlert: 'Ticket cancelled',

    // --- Mock TV Display ---
    tvDisplayTitle: 'TV Queue Display',
    nowCallingLabel: 'Now Calling',
    proceedToCounterLabel: 'Proceed to Counter {counter}',
    waitingListLabel: 'Waiting List',
    haveTicketReadyLabel: 'Please have your ticket ready',

    // --- Mock Queues Console ---
    queueControlBoardTitle: 'Queue Control Board',
    queueControlBoardSubtitle: 'Summon customers, progress workflows, and track daily metrics.',
    callNextTicketBtn: 'Call Next Ticket',
    waitingCustomersLabel: 'Waiting Customers',
    activeServingLabel: 'Active Serving',
    avgWaitTimeLabel: 'Avg Wait Time',
    callNextActionTriggeredAlert: 'Call Next action triggered',

    // --- Mock Appointments ---
    appointmentScheduleTitle: 'Appointment Schedule',
    appointmentScheduleSubtitle: 'Manage scheduled customers and check them into priority queues on arrival.',
    appointmentPlaceholder: 'Calendar slot reservations placeholder.',

    // --- Mock Branches ---
    branchesTitle: 'Branch Locations',
    branchesSubtitle: 'Configure operating hours, timezones, and display screens per physical location.',
    branchesPlaceholder: 'Branch CRUD control panel placeholder.',

    // --- Mock Services ---
    servicesTitle: 'Branch Services',
    servicesSubtitle: 'Configure service prefixes, custom fields, and link workflow pipelines.',
    servicesPlaceholder: 'Services settings placeholder.',

    // --- Mock Staff ---
    staffTitle: 'Staff Directory',
    staffSubtitle: 'Invite team members and assign branch and role configurations.',
    staffPlaceholder: 'Staff directory table placeholder.',

    // --- Mock Settings ---
    tenantSettingsTitle: 'Tenant Profile',
    tenantSettingsSubtitle: 'Manage tenant settings, brand colors, and Stripe subscriptions.',
    settingsPlaceholder: 'Subscription and billing details placeholder.',
  }
};
