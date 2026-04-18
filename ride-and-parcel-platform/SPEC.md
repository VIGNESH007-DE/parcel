# RideShare & Deliver - Platform Specification

## Concept & Vision

RideShare & Deliver is a modern, all-in-one mobility platform combining ride-sharing and parcel delivery services. The app feels premium yet approachable—like Uber meets DoorDash with a warm, trustworthy aesthetic. It empowers users to travel together, send packages, and earn money as drivers.

## Design Language

### Aesthetic Direction
Premium mobility app inspired by Uber/Grab with warm, trustworthy undertones. Clean cards, subtle gradients, and clear visual hierarchy.

### Color Palette
- **Primary**: #6366F1 (Indigo - trust, technology)
- **Secondary**: #10B981 (Emerald - go, movement)
- **Accent**: #F59E0B (Amber - warmth, attention)
- **Background**: #F8FAFC (Slate-50)
- **Surface**: #FFFFFF
- **Text Primary**: #1E293B (Slate-800)
- **Text Secondary**: #64748B (Slate-500)
- **Error**: #EF4444
- **Success**: #22C55E

### Typography
- **Headings**: Inter (700, 600)
- **Body**: Inter (400, 500)
- **Monospace**: JetBrains Mono (for codes, numbers)

### Spatial System
- Base unit: 4px
- Card padding: 24px
- Section gaps: 32px
- Border radius: 12px (cards), 8px (buttons), 24px (pills)

### Motion Philosophy
- Micro-interactions: 150ms ease-out
- Page transitions: 300ms ease-in-out
- Loading states: pulse animations
- Success feedback: scale bounce (1.0 → 1.05 → 1.0)

## Layout & Structure

### Navigation
- Bottom tab bar (mobile): Home, Rides, Parcels, Profile
- Sidebar navigation (desktop): Same items + logout

### Pages
1. **Auth Pages** - Login/Signup with role selection
2. **Dashboard** - Role-based personalized home
3. **Passenger View** - Search & book rides
4. **Driver Dashboard** - Manage rides & requests
5. **Parcel Center** - Send & track parcels
6. **Profile** - User details & settings

## Features & Interactions

### Authentication
- Email/password signup with role selection
- Fields: Full Name, Age, Gender, Mobile, Email, Password
- Persistent login via Firebase Auth
- Profile view with edit capabilities

### Passenger Module
- Location-based ride search
- Ride cards showing: driver, vehicle, seats, price estimate
- One-tap booking with confirmation
- Real-time status updates
- "No rides available" empty state

### Driver Module
- Create ride: start, destination, stops, vehicle details
- View booking requests with accept/reject
- Seats filled vs available dashboard
- Contact sharing post-acceptance
- "Ride Full" status when capacity reached

### Parcel System
- Sender: Create parcel request with details
- Driver/Carrier: Accept parcel deliveries
- Route matching algorithm
- Contact exchange on acceptance

### Notifications
- In-app notification center
- Types: booking requests, acceptances, updates
- Unread badge counter

## Component Inventory

### Buttons
- Primary: Indigo bg, white text, hover darken
- Secondary: White bg, indigo border, hover fill
- Danger: Red bg for destructive actions
- States: default, hover, active, disabled, loading

### Cards
- Ride Card: Driver avatar, route, vehicle info, seats, book button
- Parcel Card: Sender, route, status badge, track button
- Request Card: User info, route, accept/reject buttons

### Form Elements
- Inputs: Border on focus, error states with messages
- Select dropdowns with custom styling
- Location pickers with autocomplete simulation

### Badges
- Role badges (Passenger/Driver/Parcel User)
- Status badges (Pending, Accepted, In Transit, Completed)

## Technical Approach

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Zustand for state management
- React Hot Toast for notifications

### Backend (Firebase)
- Firebase Auth for authentication
- Firestore for database
- Collections: users, rides, parcels, requests

### Data Models

**User**
```
{
  uid, fullName, age, gender, mobile, email, role, createdAt
}
```

**Ride**
```
{
  rideId, driverId, driverName, driverMobile,
  startLocation, endLocation, stops[],
  vehicleType, vehicleNumber, totalSeats,
  filledSeats, status, createdAt
}
```

**Parcel**
```
{
  parcelId, senderId, senderName, senderMobile,
  pickupLocation, dropLocation, details,
  carrierId, status, createdAt
}
```

**BookingRequest**
```
{
  requestId, rideId, passengerId, passengerName,
  status (pending/accepted/rejected), createdAt
}
```
