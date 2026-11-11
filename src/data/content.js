// All site text lives here. Edit the text between the quotes.
export const C = {
  brand: "Fast Find Label",
  tagline: "Your Phone's way Home",
  intro: [
    "An adhesive label with the phone number of someone you trust, a relative or close friend, <strong>NOT</strong> the number of the lost phone.",
    "The label can be placed on the back of your phone or on the phone case. It is thermal printed, smear proof and waterproof."
  ],
  images: [
    { src: "/images/phone-back.jpg", alt: "Phone back with a Fast Find Label sticker near the bottom", w: 491, h: 900 },
    { src: "/images/phone-case.jpg", alt: "Wallet phone case with a Fast Find Label sticker inside the flap", w: 634, h: 854 }
  ],
  get: "Get My Labels",
  shipNote: "(Shipping To USA only.)",
  delivery: "Please allow 5 to 7 days for delivery.",
  // Prices are before shipping. Confirm the 4 and 6 label prices with Bob.
  price: [{ q: 2, p: 10 }, { q: 4, p: 18 }, { q: 6, p: 25 }],
  shipping: 3,
  form: {
    choose: "Choose your labels",
    tel: "Phone number to print on the label",
    telHint: "10-digit US number of a relative or friend, <strong>NOT</strong> the number of the phone being labeled.",
    name: "Your name", email: "Your email", street: "Street address", apt: "Apt/Suite (optional)",
    city: "City", state: "State", zip: "ZIP",
    total: "Order total", pay: "Pay with PayPal",
    thanks: "Thank you, {name}! Your order for {q} labels is paid. Number to print: {tel}. Total: ${total}. PayPal will email your receipt.",
    notOpen: "Checkout opens very soon. Nothing was charged and no order was placed. Questions? Email {email}.",
    payError: "The payment did not go through. Nothing was charged. Please try again."
  },
  // The map that opens from the tagline. x and y are positions on a 300 x 180 map.
  map: {
    title: "Your Phone's way Home",
    back: "Back", next: "Next", close: "Close",
    stops: [
      { name: "Coffee shop", x: 42, y: 140, tip: "Left on the table? Whoever finds it sees who to call." },
      { name: "Grocery store", x: 85, y: 60, tip: "Dropped in a cart? The label tells the finder who to call." },
      { name: "Gym", x: 140, y: 130, tip: "Forgot it on a bench? Staff can call the number on the label." },
      { name: "Car", x: 190, y: 45, tip: "Left on the car roof? A finder knows who to call." },
      { name: "Park", x: 235, y: 125, tip: "Slipped out of a pocket? Your trusted person gets the call." },
      { name: "Home", x: 275, y: 40, tip: "Your phone is back home." }
    ]
  },
  email: "info@fastfindlabel.com",
  foot: "©2026 RFR FastFindLabel",
  // Paste Bob's live PayPal Client ID here (never the secret). Until then checkout stays closed.
  paypalClientId: "BAAgETuPL-AuNbkzFtulOniCkdt-MfySg5NYT9DQbcufLOh4po8Q4kHemJs6roV8wXwoIEfZ8Mz4utee70"
};
