// Labstore build-time switches.
// LOGIN_HELPER_MODE = true  -> the login screen shows a collapsible "Testing
//                              Helpers" cheat sheet with a Fill button per role.
// LOGIN_HELPER_MODE = false -> the login screen is the plain email/password form.
// It never changes auth logic: whoever signs in still types a real password and
// gets a real session.
export const LOGIN_HELPER_MODE = true;