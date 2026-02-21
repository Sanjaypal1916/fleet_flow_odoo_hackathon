from fastapi import HTTPException
import stripe



class PaymentService:
    @staticmethod
    def process_payment(amount: float):
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # INR → paise (must be int)
                currency="inr",
                automatic_payment_methods={
                    "enabled": True
                },
                description="Hackathon payment"
            )

            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id
            }

        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))
