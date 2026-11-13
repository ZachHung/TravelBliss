# TravelBliss

A passenger rail booking service: a web app where travellers sign in, and the API behind it.

## Language

### Sessions

**Session**:
The fact that one browser is signed in as one user, from sign-in until sign-out or expiry.
_Avoid_: auth, auth context, login state

**Signed-in user**:
The user a request or a page acts as, for the length of a session.
_Avoid_: current user, me, principal

**Guest**:
Someone with no valid session: a visitor who is not signed in, or whose session has ended.
_Avoid_: anonymous, logged-out user

**Remembered session**:
A session the user asked to keep across browser restarts ("Remember Me"). It ends after a stretch without use, or at a
maximum age since sign-in, whichever comes first.
_Avoid_: persistent login, long session

**Ending other sessions**:
Signing a user out on every browser except the current one, as happens when they change their password.
_Avoid_: logout-all, revoke all, global sign-out

### Errors

**Error code**:
The machine-readable reason attached to an expected error, shared by the API and the web app so a form can show the
right message next to the right field.
_Avoid_: error type, status
