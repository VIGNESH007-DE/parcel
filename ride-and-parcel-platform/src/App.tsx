import React, { useState, useEffect } from 'react';
import { 
  User, MapPin, Search, Car, Bike, Package, 
  LogOut, Bell, Plus, Users, 
  CheckCircle2, XCircle, ChevronRight, Phone,
  Navigation, Clock, ArrowRight
} from 'lucide-react';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  doc, setDoc, collection, addDoc, 
  query, where, onSnapshot, updateDoc, 
  Timestamp, getDocs
} from 'firebase/firestore';
import { useAuth, AuthProvider } from './context/AuthContext';

// --- Types ---
interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  startLocation: string;
  endLocation: string;
  routeStops: string[];
  vehicleType: 'Car' | 'Bike';
  vehicleNumber: string;
  totalSeats: number;
  bookedSeats: number;
  status: 'active' | 'full';
  price: number;
}

interface Booking {
  id: string;
  rideId: string;
  passengerId: string;
  passengerName: string;
  status: 'pending' | 'accepted' | 'rejected';
  driverPhone?: string;
}

interface PickupRoute {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  startLocation: string;
  endLocation: string;
  price: number;
  status: 'active' | 'booked' | 'delivered';
  senderId?: string;
  senderName?: string;
  senderPhone?: string;
  parcelDetails?: string;
}

// --- Components ---

const Navbar = ({ onLogout }: { onLogout: () => void }) => {
  const { profile } = useAuth();
  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Car className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            RideParcel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-none">{profile?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{profile?.role?.replace('_', ' ')}</p>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

const MapPlaceholder = ({ pickup, drop }: { pickup?: string, drop?: string }) => {
  return (
    <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 h-[300px] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50"></div>
      <div className="z-10 bg-white p-4 rounded-full shadow-lg mb-4 transform group-hover:scale-110 transition-transform">
        <Navigation className="w-8 h-8 text-indigo-600" />
      </div>
      <p className="z-10 font-semibold text-slate-700">Live Route Map</p>
      {pickup && drop ? (
        <div className="z-10 mt-4 space-y-2 max-w-xs">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>{pickup}</span>
          </div>
          <div className="w-[2px] h-4 bg-slate-200 ml-1"></div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span>{drop}</span>
          </div>
        </div>
      ) : (
        <p className="z-10 text-sm text-slate-400 mt-2">Enter locations to see route and stops</p>
      )}
    </div>
  );
};

// --- Main Views ---

const PassengerDashboard = () => {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'bookings'), where('passengerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
    return () => unsubscribe();
  }, [user]);

  const searchRides = async () => {
    setLoading(true);
    setHasSearched(true);
    // Real logic would use fuzzy location matching
    const q = query(collection(db, 'rides'), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));
    
    // Simple mock filter for demo
    if (pickup || drop) {
      setRides(results.filter(r => 
        r.startLocation.toLowerCase().includes(pickup.toLowerCase()) || 
        r.endLocation.toLowerCase().includes(drop.toLowerCase())
      ));
    } else {
      setRides(results);
    }
    setLoading(false);
  };

  const bookRide = async (ride: Ride) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'bookings'), {
        rideId: ride.id,
        passengerId: user.uid,
        passengerName: auth.currentUser?.displayName || 'Passenger',
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert('Ride request sent!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Find a Ride</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Pickup Location" 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Navigation className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Where to?" 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={searchRides}
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
        >
          {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Search className="w-5 h-5" /> Search Rides</>}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 px-1">Available Rides</h3>
          {hasSearched ? (
            rides.length > 0 ? (
              rides.map(ride => (
                <div key={ride.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                        {ride.vehicleType === 'Car' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{ride.driverName}</h4>
                        <p className="text-sm text-gray-500">{ride.vehicleType} • {ride.vehicleNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-indigo-600">${ride.price}</p>
                      <p className="text-xs text-gray-400 font-medium">{ride.totalSeats - ride.bookedSeats} seats left</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl">
                    <div className="flex-1 truncate font-medium">{ride.startLocation}</div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 truncate font-medium">{ride.endLocation}</div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button 
                      onClick={() => bookRide(ride)}
                      disabled={bookings.some(b => b.rideId === ride.id)}
                      className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {bookings.some(b => b.rideId === ride.id) ? 'Request Sent' : 'Book Now'}
                    </button>
                    <button className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No rides available for this route</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400">Search to see available rides</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Your Bookings
            </h3>
            <div className="space-y-4">
              {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Ride Booking</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      booking.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Booking ID: #{booking.id.slice(0, 5)}</p>
                  {booking.status === 'accepted' && (
                    <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-100">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-bold">Contact: {booking.driverPhone}</span>
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center py-4">No active bookings</p>
              )}
            </div>
          </div>
          <MapPlaceholder pickup={pickup} drop={drop} />
        </div>
      </div>
    </div>
  );
};

const DriverDashboard = () => {
  const [showAddRide, setShowAddRide] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { user, profile } = useAuth();

  // Ride Form State
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [currentStop, setCurrentStop] = useState('');
  const [vehicle, setVehicle] = useState<'Car' | 'Bike'>('Car');
  const [vehicleNum, setVehicleNum] = useState('');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState(10);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'rides'), where('driverId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    });

    const qB = query(collection(db, 'bookings'), where('status', '==', 'pending'));
    const unsubscribeB = onSnapshot(qB, (snapshot) => {
      // Logic would be more complex to match driverId in booking->ride
      const allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(allBookings); 
    });

    return () => {
      unsubscribe();
      unsubscribeB();
    };
  }, [user]);

  const addRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    try {
      await addDoc(collection(db, 'rides'), {
        driverId: user.uid,
        driverName: profile.name,
        driverPhone: profile.phone,
        startLocation: startLoc,
        endLocation: endLoc,
        routeStops: stops,
        vehicleType: vehicle,
        vehicleNumber: vehicleNum,
        totalSeats: seats,
        bookedSeats: 0,
        status: 'active',
        price: Number(price),
        createdAt: Timestamp.now()
      });
      setShowAddRide(false);
      setStartLoc(''); setEndLoc(''); setStops([]);
    } catch (e) { console.error(e); }
  };

  const handleBooking = async (booking: Booking, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { 
        status,
        driverPhone: status === 'accepted' ? profile?.phone : null 
      });
      if (status === 'accepted') {
        const rideRef = doc(db, 'rides', booking.rideId);
        // This should use a transaction in a real app
        const ride = rides.find(r => r.id === booking.rideId);
        if (ride) {
          const newBooked = ride.bookedSeats + 1;
          await updateDoc(rideRef, { 
            bookedSeats: newBooked,
            status: newBooked >= ride.totalSeats ? 'full' : 'active'
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Driver Dashboard</h2>
          <p className="text-gray-500 mt-1">Manage your rides and passenger requests</p>
        </div>
        <button 
          onClick={() => setShowAddRide(!showAddRide)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 group"
        >
          {showAddRide ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
          {showAddRide ? 'Cancel' : 'Create New Ride'}
        </button>
      </div>

      {showAddRide && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-in zoom-in-95 duration-200">
          <form onSubmit={addRide} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Starting Point</label>
                <input 
                  required
                  placeholder="e.g. Downtown Central" 
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={startLoc}
                  onChange={e => setStartLoc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Destination</label>
                <input 
                  required
                  placeholder="e.g. Airport Terminal 1" 
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={endLoc}
                  onChange={e => setEndLoc(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Stops (Optional)</label>
              <div className="flex gap-2">
                <input 
                  placeholder="Add a stop..." 
                  className="flex-1 px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={currentStop}
                  onChange={e => setCurrentStop(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (currentStop) {
                        setStops([...stops, currentStop]);
                        setCurrentStop('');
                      }
                    }
                  }}
                />
                <button 
                  type="button"
                  onClick={() => { if(currentStop) { setStops([...stops, currentStop]); setCurrentStop(''); } }}
                  className="px-6 bg-indigo-50 text-indigo-600 rounded-2xl font-bold"
                >
                  Add
                </button>
              </div>
              {stops.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {stops.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1">
                      {s} <button onClick={() => setStops(stops.filter((_, idx) => idx !== i))}><XCircle className="w-3 h-3"/></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Vehicle</label>
                <select 
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none appearance-none"
                  value={vehicle}
                  onChange={e => setVehicle(e.target.value as any)}
                >
                  <option>Car</option>
                  <option>Bike</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Vehicle No.</label>
                <input 
                  required
                  placeholder="ABC-1234" 
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={vehicleNum}
                  onChange={e => setVehicleNum(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Seats</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={seats}
                  onChange={e => setSeats(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Price ($)</label>
                <input 
                  type="number"
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                  value={price}
                  onChange={e => setPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <button className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              Launch Ride
            </button>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-gray-900 px-1">Your Active Rides</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {rides.length > 0 ? rides.map(ride => (
              <div key={ride.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
                    ride.status === 'full' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {ride.status}
                  </div>
                  <div className="text-lg font-black text-indigo-600">${ride.price}</div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-white"></div>
                      <div className="w-[1px] h-full bg-gray-200 my-1"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                    </div>
                    <div className="flex flex-col gap-4 text-sm font-semibold text-gray-700 -mt-1">
                      <div className="truncate">{ride.startLocation}</div>
                      <div className="truncate">{ride.endLocation}</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                      <Users className="w-4 h-4" />
                      {ride.bookedSeats} / {ride.totalSeats} booked
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600">
                        {ride.vehicleType}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-16 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">You haven't created any rides yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Pending Requests
            </h3>
            <div className="space-y-4">
              {bookings.length > 0 ? bookings.map(booking => (
                <div key={booking.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                      {booking.passengerName[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{booking.passengerName}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ride Request</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleBooking(booking, 'accepted')}
                      className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button 
                      onClick={() => handleBooking(booking, 'rejected')}
                      className="flex-1 bg-white border border-gray-200 text-gray-500 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">No pending requests</p>
                </div>
              )}
            </div>
          </div>
          <MapPlaceholder />
        </div>
      </div>
    </div>
  );
};

const SenderDashboard = () => {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [routes, setRoutes] = useState<PickupRoute[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeParcels, setActiveParcels] = useState<PickupRoute[]>([]);
  const { user, profile } = useAuth();
  
  const [parcelDetails, setParcelDetails] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pickup_routes'), where('senderId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveParcels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRoute)));
    });
    return () => unsubscribe();
  }, [user]);

  const searchRoutes = async () => {
    setHasSearched(true);
    const q = query(collection(db, 'pickup_routes'), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRoute));
    if (pickup || drop) {
      setRoutes(results.filter(r => 
        r.startLocation.toLowerCase().includes(pickup.toLowerCase()) || 
        r.endLocation.toLowerCase().includes(drop.toLowerCase())
      ));
    } else {
      setRoutes(results);
    }
  };

  const acceptPickup = async (route: PickupRoute) => {
    if (!user || !profile) return;
    if (!parcelDetails) return alert('Please enter parcel details first!');
    try {
      await updateDoc(doc(db, 'pickup_routes', route.id), {
        status: 'booked',
        senderId: user.uid,
        senderName: profile.name,
        senderPhone: profile.phone,
        parcelDetails
      });
      alert('Pickup accepted!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Find a Parcel Pickup</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <input type="text" placeholder="Pickup Location" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none" value={pickup} onChange={(e) => setPickup(e.target.value)} />
          <input type="text" placeholder="Drop Location" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none" value={drop} onChange={(e) => setDrop(e.target.value)} />
        </div>
        <textarea placeholder="Describe the parcel to send..." className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none mb-4" value={parcelDetails} onChange={(e) => setParcelDetails(e.target.value)} />
        <button onClick={searchRoutes} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
          <Search className="w-5 h-5" /> Search Pickups
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 px-1">Available Pickups</h3>
          {hasSearched ? (
            routes.length > 0 ? (
              routes.map(r => (
                <div key={r.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-900">{r.driverName}</h4>
                      <p className="text-sm text-gray-500">{r.startLocation} to {r.endLocation}</p>
                    </div>
                    <p className="text-xl font-bold text-indigo-600">${r.price}</p>
                  </div>
                  <button onClick={() => acceptPickup(r)} className="bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black w-full">
                    Accept this Pickup
                  </button>
                </div>
              ))
            ) : <p className="text-gray-500">No pickups found</p>
          ) : <p className="text-gray-400">Search to see pickups</p>}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">Your Active Parcels</h3>
            <div className="space-y-4">
              {activeParcels.filter(p => p.status !== 'delivered').map(p => (
                <div key={p.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50">
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{p.status}</span>
                  <p className="text-sm font-semibold mt-2">{p.parcelDetails}</p>
                  <p className="text-xs text-gray-500">To: {p.endLocation}</p>
                  <div className="mt-3 flex items-center gap-2 text-indigo-700 font-bold text-sm">
                     <Phone className="w-4 h-4"/> Driver: {p.driverPhone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PickupDashboard = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [routes, setRoutes] = useState<PickupRoute[]>([]);
  const { user, profile } = useAuth();

  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [price, setPrice] = useState<number>(5);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pickup_routes'), where('driverId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRoutes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PickupRoute)));
    });
    return () => unsubscribe();
  }, [user]);

  const addRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    try {
      await addDoc(collection(db, 'pickup_routes'), {
        driverId: user.uid,
        driverName: profile.name,
        driverPhone: profile.phone,
        startLocation: startLoc,
        endLocation: endLoc,
        price,
        status: 'active',
      });
      setShowAdd(false); setStartLoc(''); setEndLoc('');
    } catch (e) { console.error(e); }
  };

  const markDelivered = async (id: string) => {
    try {
      await updateDoc(doc(db, 'pickup_routes', id), { status: 'delivered' });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Pickup Driver</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
          {showAdd ? <XCircle className="w-5 h-5"/> : <Package className="w-5 h-5"/>} Set Route
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addRoute} className="bg-white p-6 rounded-3xl shadow-sm border space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input required placeholder="From Location" className="px-5 py-4 bg-gray-50 rounded-2xl outline-none" value={startLoc} onChange={e=>setStartLoc(e.target.value)} />
            <input required placeholder="To Location" className="px-5 py-4 bg-gray-50 rounded-2xl outline-none" value={endLoc} onChange={e=>setEndLoc(e.target.value)} />
          </div>
          <div className="w-1/2">
             <label className="text-sm font-bold ml-1">Price ($)</label>
             <input type="number" required className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none mt-1" value={price} onChange={e=>setPrice(Number(e.target.value))} />
          </div>
          <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl">Publish Route</button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {routes.filter(r => r.status !== 'delivered').map(r => (
          <div key={r.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative">
            <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase ${r.status === 'booked' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.status}</span>
            <div className="flex justify-between">
              <h3 className="font-bold text-gray-900">{r.startLocation} → {r.endLocation}</h3>
            </div>
            <p className="text-lg font-extrabold text-indigo-600 mt-2">${r.price}</p>
            {r.status === 'booked' && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <p className="text-sm"><strong>Parcel:</strong> {r.parcelDetails}</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <Phone className="w-4 h-4"/> Sender: {r.senderPhone} ({r.senderName})
                </div>
                <button onClick={() => markDelivered(r.id)} className="w-full bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> Mark Delivered
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Auth Views ---

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <div className="max-w-md w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-4">
          <Car className="text-white w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">RideParcel</h1>
        <p className="text-gray-500 font-medium mt-2">Connecting people and logistics</p>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        {children}
      </div>
    </div>
  </div>
);

const LoginPage = ({ onToggle }: { onToggle: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
        <input 
          type="email" 
          required 
          className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none" 
          placeholder="name@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 ml-1">Password</label>
        <input 
          type="password" 
          required 
          className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none" 
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <button 
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Sign In'}
      </button>
      <p className="text-center text-sm text-gray-500 font-medium">
        Don't have an account? <button type="button" onClick={onToggle} className="text-indigo-600 font-bold hover:underline">Create one</button>
      </p>
    </form>
  );
};

const SignupPage = ({ onToggle }: { onToggle: () => void }) => {
  const [formData, setFormData] = useState({
    name: '', age: '', gender: 'Male', phone: '', email: '', password: '', role: 'passenger' as any
  });
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        role: formData.role,
        createdAt: Timestamp.now()
      });
      // Context will pick up the profile
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 ml-1">Full Name</label>
          <input required className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm" placeholder="John Doe" onChange={e=>setFormData({...formData, name:e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 ml-1">Age</label>
          <input type="number" required className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm" placeholder="25" onChange={e=>setFormData({...formData, age:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 ml-1">Gender</label>
          <select className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm appearance-none" onChange={e=>setFormData({...formData, gender:e.target.value})}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700 ml-1">Phone Number</label>
          <input required className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm" placeholder="+1..." onChange={e=>setFormData({...formData, phone:e.target.value})} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-700 ml-1">Email</label>
        <input type="email" required className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm" placeholder="email@example.com" onChange={e=>setFormData({...formData, email:e.target.value})} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-700 ml-1">Password</label>
        <input type="password" required className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-600 transition-all outline-none text-sm" placeholder="••••••••" onChange={e=>setFormData({...formData, password:e.target.value})} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-700 ml-1">Your Primary Role</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {['passenger', 'driver', 'sender_parcel', 'pickup_parcel'].map(r => (
            <button 
              key={r}
              type="button"
              onClick={() => setFormData({...formData, role: r as any})}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase transition-all ${
                formData.role === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <button 
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2 flex items-center justify-center"
      >
        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Create Account'}
      </button>
      <p className="text-center text-sm text-gray-500 font-medium">
        Already have an account? <button type="button" onClick={onToggle} className="text-indigo-600 font-bold hover:underline">Log in</button>
      </p>
    </form>
  );
};

// --- Main App Component ---

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user || !profile) {
    return (
      <AuthLayout>
        {isLogin ? (
          <LoginPage onToggle={() => setIsLogin(false)} />
        ) : (
          <SignupPage onToggle={() => setIsLogin(true)} />
        )}
      </AuthLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onLogout={() => signOut(auth)} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {profile.role === 'passenger' && <PassengerDashboard />}
        {profile.role === 'driver' && <DriverDashboard />}
        {profile.role === 'sender_parcel' && <SenderDashboard />}
        {profile.role === 'pickup_parcel' && <PickupDashboard />}
        {profile.role === 'parcel_user' as any && <SenderDashboard />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
