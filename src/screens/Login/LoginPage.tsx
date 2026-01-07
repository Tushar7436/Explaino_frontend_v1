import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
// @ts-ignore
import "flag-icons/css/flag-icons.min.css";

// Common country codes
const countryCodes = [
  { code: "+1", country: "US/CA", iso: "us" },
  { code: "+44", country: "UK", iso: "gb" },
  { code: "+91", country: "IN", iso: "in" },
  { code: "+86", country: "CN", iso: "cn" },
  { code: "+81", country: "JP", iso: "jp" },
  { code: "+49", country: "DE", iso: "de" },
  { code: "+33", country: "FR", iso: "fr" },
  { code: "+61", country: "AU", iso: "au" },
  { code: "+7", country: "RU", iso: "ru" },
  { code: "+55", country: "BR", iso: "br" },
  { code: "+82", country: "KR", iso: "kr" },
  { code: "+34", country: "ES", iso: "es" },
  { code: "+39", country: "IT", iso: "it" },
  { code: "+52", country: "MX", iso: "mx" },
  { code: "+31", country: "NL", iso: "nl" },
  { code: "+46", country: "SE", iso: "se" },
  { code: "+41", country: "CH", iso: "ch" },
  { code: "+47", country: "NO", iso: "no" },
  { code: "+48", country: "PL", iso: "pl" },
  { code: "+65", country: "SG", iso: "sg" },
  { code: "+60", country: "MY", iso: "my" },
  { code: "+66", country: "TH", iso: "th" },
  { code: "+84", country: "VN", iso: "vn" },
  { code: "+62", country: "ID", iso: "id" },
  { code: "+63", country: "PH", iso: "ph" },
  { code: "+64", country: "NZ", iso: "nz" },
  { code: "+27", country: "ZA", iso: "za" },
  { code: "+20", country: "EG", iso: "eg" },
  { code: "+234", country: "NG", iso: "ng" },
  { code: "+971", country: "AE", iso: "ae" },
  { code: "+966", country: "SA", iso: "sa" },
  { code: "+90", country: "TR", iso: "tr" },
  { code: "+972", country: "IL", iso: "il" },
  { code: "+351", country: "PT", iso: "pt" },
  { code: "+30", country: "GR", iso: "gr" },
  { code: "+420", country: "CZ", iso: "cz" },
  { code: "+43", country: "AT", iso: "at" },
  { code: "+32", country: "BE", iso: "be" },
  { code: "+45", country: "DK", iso: "dk" },
  { code: "+358", country: "FI", iso: "fi" },
  { code: "+353", country: "IE", iso: "ie" },
];

const GRAPHQL_ENDPOINT = "https://db.vocallabs.ai/v1/graphql";

const REGISTER_MUTATION = `
  mutation RegisterV4($phone: String!, $recaptcha_token: String!) {
    registerWithoutPasswordV4(credentials: {phone: $phone, recaptcha_token: $recaptcha_token}) {
      request_id
      status
    }
  }
`;

const VERIFY_OTP_MUTATION = `
  mutation VerifyOTPV3($phone1: String!, $otp1: String!) {
    verifyOTPV3(request: {otp: $otp1, phone: $phone1}) {
      auth_token
      refresh_token
      id
      status
      deviceInfoSaved
    }
  }
`;

const GET_USER_DATA = `
  query GetUserData($id: uuid!) {
    subspace {
      auth(where: {id: {_eq: $id}}) {
        id
        fullname
        phone
        email
        dp
        username
        email_verified
        country
        currency
      }
    }
  }
`;

const CHECK_CLIENT_AND_USER_QUERY = `
  query CheckClientAndUser($id: uuid!) {
    vocallabs_client_by_pk(id: $id) {
      id
    }
    subspace {
      auth(where: {id: {_eq: $id}}) {
        fullname
        email
        username
        phone
      }
    }
  }
`;

const CHECK_COMPANY_QUERY = `
  query CheckCompany($id: uuid!) {
    vocallabs_client(where: {id: {_eq: $id}}) {
      company_name
    }
  }
`;

const UPDATE_COMPANY_MUTATION = `
  mutation UpdateCompany($id: uuid!, $company_name: String!) {
    insert_vocallabs_client_one(
      object: { id: $id, company_name: $company_name }
      on_conflict: { 
        constraint: client_pkey,
        update_columns: [company_name]
      }
    ) {
      id
      company_name
    }
  }
`;

const UPDATE_USER_DATA_MUTATION = `
  mutation UpdateUser($id: uuid!, $fullname: String!, $email: String!, $username: String!) {
    subspace {
      update_auth(where: {id: {_eq: $id}}, _set: {fullname: $fullname, email: $email, username: $username}) {
        affected_rows
        returning {
          id
          fullname
          email
        }
      }
    }
  }
`;

// Predefined industries for the dropdown
const INDUSTRIES = [
  "Technology",
  "Saas",
  "E-commerce",
  "Education",
  "Healthcare",
  "Finance",
  "Marketing",
  "Other"
];

export const LoginPage = () => {
  const navigate = useNavigate();

  // Login States
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState("");

  // UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [savingData, setSavingData] = useState(false);

  // Onboarding States
  const [onboardingStep, setOnboardingStep] = useState(0); // 0: Login, 1: Name, 2: Email, 3: Company
  const [onboardingData, setOnboardingData] = useState({
    username: "",
    email: "",
    companyName: "",
    industry: ""
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setError("");
    setLoading(true);

    try {
      console.log("Generating CAP token...");

      let capToken;
      if ((window as any).capInstance) {
        capToken = await (window as any).capInstance.getToken();
      } else {
        throw new Error("CAP.js not initialized");
      }

      if (!capToken) {
        throw new Error("Failed to generate CAP token");
      }

      console.log("CAP Token generated:", capToken);

      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const requestPayload = {
        operationName: "RegisterV4",
        query: REGISTER_MUTATION,
        variables: {
          phone: fullPhoneNumber,
          recaptcha_token: capToken, // variable name kept as requested
        },
      };

      console.log("Sending OTP request...", requestPayload);
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();
      console.log("OTP Response:", result);

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        setError(result.errors[0]?.message || "Failed to send OTP.");
        return;
      }

      if (result.data?.registerWithoutPasswordV4?.status === "success") {
        setRequestId(result.data.registerWithoutPasswordV4.request_id);
        setShowOtpInput(true);
        setError("");
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string, authToken: string, refreshToken: string) => {
    try {
      console.log("Fetching user data for ID:", userId);

      // 1. Check User Profile
      const userResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operationName: "CheckClientAndUser",
          query: CHECK_CLIENT_AND_USER_QUERY,
          variables: { id: userId }
        }),
      });

      // 2. Check Company Data
      const companyResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operationName: "CheckCompany",
          query: CHECK_COMPANY_QUERY,
          variables: { id: userId }
        }),
      });

      const userResult = await userResponse.json();
      const companyResult = await companyResponse.json();

      if (userResult.errors || companyResult.errors) {
        console.error("Data Query Errors:", userResult.errors || companyResult.errors);
        setError("Failed to load user profile.");
        return;
      }

      const userData = userResult.data?.subspace?.auth?.[0];
      const companyData = companyResult.data?.vocallabs_client?.[0];

      // --- Store Data in Local Storage ---
      if (userData) {
        // Parse JWT for expiry
        let tokenExpiry = 0;
        try {
          const base64Url = authToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decoded = JSON.parse(jsonPayload);
          if (decoded.exp) {
            tokenExpiry = decoded.exp * 1000; // convert to ms
          }
        } catch (e) {
          console.error("Failed to parse JWT", e);
        }

        localStorage.setItem("authToken", authToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("id", userId);
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("tokenExpiry", tokenExpiry.toString());

        // Flattened fields
        localStorage.setItem("fullname", userData.fullname || "");
        localStorage.setItem("username", userData.username || "");
        localStorage.setItem("email", userData.email || "");
        localStorage.setItem("phone", userData.phone || "");
        localStorage.setItem("country", userData.country || "");
        localStorage.setItem("currency", userData.currency || "");
        localStorage.setItem("dp", userData.dp || "");
        localStorage.setItem("email_verified", userData.email_verified ? "true" : "false");

        // User Object
        localStorage.setItem("user", JSON.stringify(userData));

        // Legacy support (if needed by other parts not yet updated)
        localStorage.setItem("user_name", userData.fullname || userData.username || "User");
        localStorage.setItem("user_id", userId);
        localStorage.setItem("auth_token", authToken);
        localStorage.setItem("refresh_token", refreshToken);
      }
      // -----------------------------------

      // Determine if onboarding is needed
      const isCompanyComplete = companyData && companyData.company_name;

      if (!isCompanyComplete) {
        console.log("Company data missing. Starting onboarding...");
        setOnboardingData(prev => ({
          ...prev,
          username: userData?.username || userData?.fullname || "",
          email: userData?.email || "",
          companyName: companyData?.company_name || ""
        }));
        setOnboardingStep(1);
      } else {
        console.log("Company set. Navigating to dashboard.");
        navigate("/dashboard");
      }

    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to initialize user session. Please try again.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setError("");
    setVerifyingOtp(true);

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      const requestPayload = {
        operationName: "VerifyOTPV3",
        query: VERIFY_OTP_MUTATION,
        variables: {
          phone1: fullPhoneNumber,
          otp1: otp,
        },
      };

      console.log("Verifying OTP...");
      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const result = await response.json();

      if (result.errors) {
        setError(result.errors[0]?.message || "Invalid OTP.");
        return;
      }

      if (result.data?.verifyOTPV3?.status === "success") {
        const { auth_token, refresh_token, id } = result.data.verifyOTPV3;

        console.log("OTP Verified. Fetching user data...");
        await fetchUserData(id, auth_token, refresh_token);
      } else {
        setError("OTP verification failed.");
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(err.message || "Verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only 1 Step verify
    if (!onboardingData.companyName) {
      setError("Company Name is required.");
      return;
    }

    setSavingData(true);
    setError("");

    try {
      const userId = localStorage.getItem("user_id");
      const authToken = localStorage.getItem("auth_token");

      if (!userId || !authToken) {
        throw new Error("User session not found");
      }

      console.log("Saving company data...", onboardingData.companyName);

      // Only Update Company
      const companyResponse = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          operationName: "UpdateCompany",
          query: UPDATE_COMPANY_MUTATION,
          variables: {
            id: userId,
            company_name: onboardingData.companyName
          }
        }),
      });

      const companyResult = await companyResponse.json();
      if (companyResult.errors) {
        throw new Error(companyResult.errors[0]?.message || "Failed to save company details");
      }

      console.log("Company Saved:", companyResult);

      // Success
      navigate("/dashboard");

    } catch (err: any) {
      console.error("Error saving data:", err);
      setError(err.message || "Failed to save details");
    } finally {
      setSavingData(false);
    }
  };

  const renderOnboardingStep = () => {
    // Only one step now
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
          <p className="text-sm text-gray-500">Please enter your company name to get started.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Company Name
          </label>
          <Input
            placeholder="Acme Inc."
            value={onboardingData.companyName}
            onChange={(e) => setOnboardingData({ ...onboardingData, companyName: e.target.value })}
            autoFocus
            className="w-full h-11"
          />
        </div>
      </div>
    );
  };

  const getStepProgress = () => {
    // Hide progress bar for valid steps
    return null;
  };

  const fullPhoneNumber = `${countryCode} ${phoneNumber}`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#1a1a2e] relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#2563EB]/10 blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px]" />

      <div className="w-full max-w-md p-8 bg-white dark:bg-[#252538] rounded-2xl shadow-xl z-10 mx-4 border border-gray-100 dark:border-gray-800 backdrop-blur-sm relative">
        <div className="flex flex-col items-center mb-8">
          <img
            className="h-16 w-auto mb-4 object-contain"
            alt="Explaino Logo"
            src="https://cdn.vocallabs.ai/landing_page/a2b0cd13-51fb-49ae-80fb-a9a245053d25.png"
          />

          {onboardingStep === 0 && (
            <>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                {showOtpInput ? "Enter Code" : "Welcome Back"}
              </h1>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
                {showOtpInput
                  ? `We sent a code to ${fullPhoneNumber}`
                  : "Enter your phone number to sign in"}
              </p>
            </>
          )}

          {onboardingStep > 0 && getStepProgress()}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {onboardingStep === 0 ? (
          // Login / OTP Flow
          !showOtpInput ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[120px] h-11 bg-gray-50 dark:bg-[#1a1a2e] border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className={`fi fi-${countryCodes.find(c => c.code === countryCode)?.iso || 'in'} rounded-[2px]`} />
                        <span className="font-mono">{countryCode}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white dark:bg-[#252538] border-gray-200 dark:border-gray-700">
                      {countryCodes.map((country) => (
                        <SelectItem
                          key={country.code}
                          value={country.code}
                          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a2e]"
                        >
                          <span className="flex items-center gap-3">
                            <span className={`fi fi-${country.iso} rounded-[2px]`} />
                            <span className="font-mono">{country.code}</span>
                            <span className="text-xs text-gray-500 truncate max-w-[100px]">({country.country})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="tel"
                    placeholder="1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 h-11 bg-gray-50 dark:bg-[#1a1a2e] border-gray-200 dark:border-gray-700 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                    required
                    autoFocus
                    maxLength={15}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  OTP Code
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-11 bg-gray-50 dark:bg-[#1a1a2e] border-gray-200 dark:border-gray-700 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all text-center tracking-[1em] font-mono text-lg"
                  maxLength={6}
                  required
                  autoFocus
                  disabled={verifyingOtp}
                />
              </div>

              <Button
                type="submit"
                disabled={verifyingOtp || !otp}
                className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Sign In"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp("");
                  setError("");
                }}
                className="w-full text-sm text-gray-500 hover:text-[#2563EB] transition-colors"
              >
                Change phone number
              </button>
            </form>
          )
        ) : (
          // Onboarding Flow
          <form onSubmit={handleOnboardingSubmit} className="space-y-6 animation-fade-in">
            {renderOnboardingStep()}

            <Button
              type="submit"
              disabled={savingData}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingData ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {onboardingStep === 3 ? "Complete Setup" : "Continue"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* {onboardingStep === 0 && (
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{" "}
            <a href="#" className="text-[#2563EB] font-medium hover:underline">
              Sign up
            </a>
          </div>
        )} */}
      </div>
    </div>
  );
};
