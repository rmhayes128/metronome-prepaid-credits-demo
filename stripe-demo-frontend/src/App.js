import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('pk_test_51PiGRXJ0kt70hj2osUgTwvuri0PZsbOFRHrkf380O5FikSaz6zdHJqsU8RTgCUyiaVXg2f8xjtHbLfa7R80uNrs100lXpLWXMr');

const CustomerSummary = ({ customer, preloadAmount, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Created Successfully</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Name: {customer.name}
            </p>
            <p className="text-sm text-gray-500">
              Address: {customer.address.line1}, {customer.address.city}, {customer.address.state} {customer.address.postal_code}
            </p>
            <p className="text-sm text-gray-500">
              Metronome ID: {customer.metronomeCustomerId}
            </p>
            <p className="text-sm text-gray-500">
              Stripe ID: {customer.customerId}
            </p>
            <p className="text-sm text-gray-500">
              Successful purchase: ${preloadAmount}
            </p>
          </div>
          <div className="items-center px-4 py-3">
            <button
              id="ok-btn"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// U.S. states array
const usStates = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [address, setAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  });
  const [preloadAmount, setPreloadAmount] = useState('');
  const [tax, setTax] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [customer, setCustomer] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    // Create customer and setup intent
    const response = await fetch('/api/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address }),
    });
    const { clientSecret, metronomeCustomerId, customerId } = await response.json();

    // Confirm the setup intent
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: { name, address },
      },
    });
    
    if (result.error) {
      console.error(result.error);
    } else {
      console.log('Setup intent confirmed');
      // Handle successful setup
      const setDefaultResponse = await fetch('/api/set-default-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerId: customerId,
          paymentMethodId: result.setupIntent.payment_method,
        }),
      });

      const setDefaultResult = await setDefaultResponse.json();

      if (setDefaultResult.success) {

        console.log('Default payment method is set.');
        const chargeCustomerResponse = await fetch('/api/charge-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: metronomeCustomerId,
            amount: preloadAmount * 100
          })
        });

        const chargeCustomerResult = await chargeCustomerResponse.json();
        if (chargeCustomerResult.success) {
          setCustomer({ name, address, metronomeCustomerId, customerId });
          setShowSummary(true);
        }
        
      } else {
        console.error('Failed to set default payment method');
      }
    }
  };

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handlePreloadChange = async (e) => {
    const amount = e.target.value;
    setPreloadAmount(amount);

    if (amount && address.line1 && address.city && address.state && address.postal_code) {
      const response = await fetch('/api/calculate-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, address })
      });
      const { tax } = await response.json();
      setTax(tax);
    } else {
      setTax(null);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Sign Up</h2>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="address-line1" className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            id="address-line1"
            name="line1"
            value={address.line1}
            onChange={handleAddressChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Street Address"
            required
          />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="address-city" className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              id="address-city"
              name="city"
              value={address.city}
              onChange={handleAddressChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="address-state" className="block text-sm font-medium text-gray-700">State</label>
            <select
              id="address-state"
              name="state"
              value={address.state}
              onChange={handleAddressChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select a state</option>
              {usStates.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="address-postal" className="block text-sm font-medium text-gray-700">Postal Code</label>
            <input
              type="text"
              id="address-postal"
              name="postal_code"
              value={address.postal_code}
              onChange={handleAddressChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="address-country" className="block text-sm font-medium text-gray-700">Country</label>
            <select
              id="address-country"
              name="country"
              value={address.country}
              onChange={handleAddressChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              {/* Add more countries as needed */}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="card-element" className="block text-sm font-medium text-gray-700">Credit Card</label>
          <div className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
            <CardElement id="card-element" />
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="preload-amount" className="block text-sm font-medium text-gray-700">Preload Amount</label>
          <input
            type="number"
            id="preload-amount"
            value={preloadAmount}
            onChange={handlePreloadChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter amount"
            min="0"
            step="0.01"
          />
        </div>
        {tax !== null && (
          <div className="mb-4 p-3 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">Calculated Tax: <span className="font-medium">${tax.toFixed(2)}</span></p>
          </div>
        )}
        <button
          type="submit"
          disabled={!stripe}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Sign Up
        </button>
      </form>
      {showSummary && <CustomerSummary customer={customer} preloadAmount={preloadAmount} onClose={() => setShowSummary(false)} />}
    </>
  );
};

const App = () => (
  <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
    <div className="relative py-3 sm:max-w-xl sm:mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
      <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
        <div className="max-w-md mx-auto">
          <div className="divide-y divide-gray-200">
            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
              <h2 className="text-3xl font-extrabold text-gray-900">Welcome to Our Platform</h2>
              <p className="text-gray-600">Sign up and start using our services today!</p>
            </div>
            <div className="pt-6 text-base leading-6 font-bold sm:text-lg sm:leading-7">
              <Elements stripe={stripePromise}>
                <CheckoutForm />
              </Elements>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default App;