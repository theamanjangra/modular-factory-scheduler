# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/vederra_db

# Firebase Admin SDK Configuration
# These values should match your Firebase service account JSON file
FIREBASE_PROJECT_ID=vederra-7c271
FIREBASE_PRIVATE_KEY_ID=759bcea130907845d6b46d6873dcde9cc0ab17e3
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXUP+vT7Sx15Yd\nBSt0VI3A/fjiQ9vJINdKbLUcw+y6rzmoAglcl3PNH3dPUqxNEiKf/uvLWJpaR5VO\nYKszEahX9cNC/ftoJ60rcTEq8KCH2ZcpRJ5Ol1j3vZPW3sau3mKi4J6fw1vS1Sr5\njWyRWABTQAbDGJhvwNSKUCjzAQSizt3HMTmKjcbw5+cNYyvoYTCNYmts/zUSUi2H\nujBgdrUWU5cbNzXTLhsyfJ+7FJ6ewXxpf4cjkMSBRwBZ6Nfi34Py1JpEKUobJS7n\n7mfY5CaOywW6eyHsN3zPYPoD5noSimUvYh/gePAu4kPwzxGgTk7V5gosLbCiFuZ7\nlX4cp2SDAgMBAAECggEADomUpyNZtF41b5fUmMHytjKPlhtLIMJxDBXYiUIoiWw2\nQi6CWk2MJIUjhZKz48ToheaXc1Rz9h96KF9k1Qmz/4hY2tI8zLSialn182EUEvKx\nKY33+vTDWCq6a29WzndhBSqRmyt8rM32slWxnFiVi7QOy30CzHIiXNpPrCSH9G6l\nBnmXkQfpO7tE2/t5a6XaktJnKdubtMCqUWWeAmbxiCsFDNmtdtgABkukPNQZ/CgT\ndlIS+zelS2OiysarJyw2cWjcIdaex66Jx1XiHS2COPjufW2AqpV8458CtXxC09HA\nha1+lvKfbwx1OJ0THBQ/1MgVRud08qR4z8O7wNCd6QKBgQD86ajUXmMMvYicqkcl\n6Y+VaFznDCO76NDGfULl8rBqcU+Qra0q2FsQCi+Q/RafEGR6IbK7wuQtrL599F6h\nUoQpNrs7ArJmcyTPIb9emipJg2CbMuDBelk8yTVT5KciHwpJARd74F6yjPyxSsWd\nU1mN4kRHxvSegcyoNB5PvYpDmwKBgQDZ8do9HrKTV7SI+06zXH/h3M9TqxvGlxdA\n1WC7i17K03/cgnXEBN+9pKa9ssIeg1aeYUh7MU/xYaCEucAjbEg+8Bfu1NiF2vkM\nTlFHnAelYRcnqDllbMwCCRaeY5OGMTLQoDoZC4RB/ZWZ6ji4AuZaWmqv+B+OOFBy\nM0MGCLH1OQKBgDxfGmn3TfWQmLes/ebS5e9oRiTxBOaqIIwBAqMZV3tRKQkELD35\n/2LIy6n0gB3gL9vnh17Cmu08Owyd9KjVpa6g3fisICHMgpDfIWtXqZh6v+jMMFJ+\n/iZAcXZhMnQ2rKHYnN55JKHCfd9kVd/EMbBovpvTpjjgCxZruoCWYhbZAoGBAMIR\nRujHzfG/1kVnqeOyyTjgu0jgg4Iphg44MsOtTcJD5IYBMUZTpLukwskGRS6Qeu/a\n5oS0G2BwM1QcZwfj4s0QU+9aXleK7dtUXbHrMS/FLa4lcL5sy5hAaYCuYG3Mn1gA\nZNtqUuHEIZOFae4Ivv/TpU5+HfMxGAkotlTIJ1aZAoGAU6hD1wr5DpJLbu9cJ910\nulFWlcFT7DdiBSYnxk0H5prfI8gArNnd7bVGkyXVpVRADuRgpi3o5xaCyJbBq5Eu\nr6B00mq1++WGzHswdF4vOnOhWJ+RwojgyMZ347iO9syqEA/prh71hRaYyfYDpG/g\nBXxNJImwy5q1l+5keDrhllw=\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@vederra-7c271.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=105346093825724996946
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40vederra-7c271.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
```

## Firebase Service Account JSON Mapping

The environment variables map to your Firebase service account JSON file as follows:

| JSON Field | Environment Variable |
|------------|---------------------|
| `project_id` | `FIREBASE_PROJECT_ID` |
| `private_key_id` | `FIREBASE_PRIVATE_KEY_ID` |
| `private_key` | `FIREBASE_PRIVATE_KEY` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `client_id` | `FIREBASE_CLIENT_ID` |
| `auth_uri` | `FIREBASE_AUTH_URI` |
| `token_uri` | `FIREBASE_TOKEN_URI` |
| `auth_provider_x509_cert_url` | `FIREBASE_AUTH_PROVIDER_CERT_URL` |
| `client_x509_cert_url` | `FIREBASE_CLIENT_CERT_URL` |
| `universe_domain` | `FIREBASE_UNIVERSE_DOMAIN` |

## Setup Instructions

1. **Copy the environment variables** from above into your `.env` file
2. **Update the DATABASE_URL** with your actual PostgreSQL connection string
3. **Verify Firebase credentials** match your service account JSON file
4. **Start the server**: `npm run dev`

## Security Notes

- Never commit your `.env` file to version control
- Keep your Firebase private key secure
- Use different credentials for development and production
- Consider using a secrets management service for production
