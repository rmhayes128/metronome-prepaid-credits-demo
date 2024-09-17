const Metronome = require('@metronome/sdk');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const express = require('express');
const metronome = new Metronome();

const app = express();
app.use(express.json());

app.post('/api/create-customer', async (req, res) => {
  const { name, address } = req.body;

  console.log("Received request to create customer.")
  try {
    const customer = await stripe.customers.create({
        name,
        address: {
          line1: address.line1,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: address.country,
        },
      });

    console.log("Created customer in Stripe.")

    const metronomeCustomer = await metronome.customers.create({
        name: name,
        billing_config: {
            billing_provider_type: "stripe",
            billing_provider_customer_id: customer.id,
            stripe_collection_method: "charge_automatically"
        }
    })

    console.log("Created Metronome customer")

    let today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const metronomeCustomerPlan = await metronome.customers.plans.add(metronomeCustomer.data.id, {
      plan_id: "d2946c46-9456-4b3e-b2a7-d1c81f47a499",
      starting_on: today.toISOString(),
    })

    console.log("Added Metronome customer to plan")

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session',
    });

    console.log("Created setup intent.")
    res.json({ 
        clientSecret: setupIntent.client_secret,
        metronomeCustomerId: metronomeCustomer.data.id,
        customerId: customer.id,
        setupIntentId: setupIntent.id
      });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/set-default-payment', async (req, res) => {
    const { customerId, paymentMethodId } = req.body;
  
    try {
      await stripe.customers.update(customerId, {
          invoice_settings: {
          default_payment_method: paymentMethodId,
          },
      });
  
      res.json({ success: true, message: 'Default payment method set successfully' });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(400).json({ error: error.message });
    }
  });

app.post('/api/charge-customer', async (req, res) => {
    const { customerId, amount } = req.body;
  
    try {
      console.log("Trying prepaid credit grant")
      const today = new Date()
      await metronome.post('/credits/createPrepaidGrant', {
        body: {
          customer_id: customerId,
          grant_amount: {
            amount: amount,
            credit_type_id: "2714e483-4ff1-48e4-9e25-ac732e8f24f2"
          },
          name: "Prepaid credit grant",
          reason: "Prepaid credits",
          effective_at: today.toISOString(),
          invoice_date: today.toISOString(),
          expires_at: new Date(today.setFullYear(today.getFullYear() + 1)).toISOString(),
          paid_amount: {
            amount: amount,
            credit_type_id: "2714e483-4ff1-48e4-9e25-ac732e8f24f2"
          },
          priority: 0.5,
          prepaid_options: {
            billing_provider_type: "stripe",
            stripe_options: {
              calculate_tax: true,
              redirect_url: "https://example.com/action_required_redirect",
              product_id: "prod_QrOe3wiYLzydSh"
            }
          }
        },
        query: {}
      });
  
      res.json({ success: true, message: 'Customer charged successfully and credits released in Metronome' });
    } catch (error) {
      console.error('Error charging customer', error);
      res.status(400).json({ error: error.message });
    }
  });
  

app.post('/api/calculate-tax', async (req, res) => {
    const { amount, address } = req.body;
  
    try {
      const taxCalculation = await stripe.tax.calculations.create({
        currency: 'usd',
        line_items: [
          {
            amount: parseInt(amount * 100), // Convert to cents
            reference: 'preload_amount',
            product: "prod_QrOe3wiYLzydSh"
          },
        ],
        customer_details: {
          address: {
            line1: address.line1,
            city: address.city,
            state: address.state,
            postal_code: address.postal_code,
            country: address.country,
          },
          address_source: 'billing',
        },
      });
      console.log(taxCalculation)
      const tax = taxCalculation.tax_amount_exclusive / 100; // Convert back to dollars
      res.json({ tax });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));