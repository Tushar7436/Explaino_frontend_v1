import { useState, useEffect, useRef } from "react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../../../components/ui/select";
import { Camera, Loader2, AlertTriangle, User } from "lucide-react";
import { CHECK_CLIENT_AND_USER_QUERY, CHECK_COMPANY_QUERY, UPDATE_USER_DATA_MUTATION, UPDATE_COMPANY_MUTATION, GET_INDUSTRIES_QUERY } from "../../../../lib/mutations";

const GRAPHQL_ENDPOINT = "https://db.vocallabs.ai/v1/graphql";

export const SettingsSection = () => {
    const [loading, setLoading] = useState(true);
    const [savingPersonal, setSavingPersonal] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [industries, setIndustries] = useState<{ name: string }[]>([]);

    const [formData, setFormData] = useState({
        fullname: "",
        username: "",
        email: "",
        phone: "",
        companyName: "",
        industry: "",
        avatar: ""
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFormData(prev => ({ ...prev, avatar: base64String }));

                const userId = localStorage.getItem("user_id");
                if (userId) {
                    localStorage.setItem(`user_avatar_${userId}`, base64String);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const userId = localStorage.getItem("user_id");
            const authToken = localStorage.getItem("auth_token");

            if (!userId || !authToken) return;

            // Fetch User, Company, and Industries Data
            const [userRes, companyRes, industriesRes] = await Promise.all([
                fetch(GRAPHQL_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                    body: JSON.stringify({ query: CHECK_CLIENT_AND_USER_QUERY, variables: { id: userId } })
                }),
                fetch(GRAPHQL_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                    body: JSON.stringify({ query: CHECK_COMPANY_QUERY, variables: { id: userId } })
                }),
                fetch(GRAPHQL_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                    body: JSON.stringify({ query: GET_INDUSTRIES_QUERY })
                })
            ]);

            const requestUser = await userRes.json();
            const requestCompany = await companyRes.json();
            const requestIndustries = await industriesRes.json();

            const userData = requestUser.data?.subspace?.auth?.[0];
            const companyData = requestCompany.data?.vocallabs_client?.[0];
            const industriesData = requestIndustries.data?.vocallabs_industries || [];

            setIndustries(industriesData);

            if (userData) {
                const savedAvatar = localStorage.getItem(`user_avatar_${userId}`);
                setFormData(prev => ({
                    ...prev,
                    fullname: userData.fullname || "",
                    username: userData.username || "",
                    email: userData.email || "",
                    phone: userData.phone || "",
                    companyName: companyData?.company_name || "",
                    industry: companyData?.industry || "",
                    avatar: savedAvatar || ""
                }));
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSavePersonal = async () => {
        setSavingPersonal(true);
        setMessage(null);
        try {
            const userId = localStorage.getItem("user_id");
            const authToken = localStorage.getItem("auth_token");

            if (!userId || !authToken) throw new Error("Session expired");

            const updateRes = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({
                    query: UPDATE_USER_DATA_MUTATION,
                    variables: {
                        id: userId,
                        fullname: formData.fullname,
                        username: formData.username,
                        email: formData.email
                    }
                })
            });

            const userResult = await updateRes.json();
            if (userResult.errors) throw new Error(userResult.errors[0].message);

            // Update local storage name
            localStorage.setItem("user_name", formData.fullname || formData.username);

            setMessage({ type: 'success', text: "Personal information updated!" });
        } catch (error: any) {
            console.error("Save personal error:", error);
            setMessage({ type: 'error', text: error.message || "Failed to update personal info" });
        } finally {
            setSavingPersonal(false);
        }
    };

    const handleSaveCompany = async () => {
        setSavingCompany(true);
        setMessage(null);
        try {
            const userId = localStorage.getItem("user_id");
            const authToken = localStorage.getItem("auth_token");

            if (!userId || !authToken) throw new Error("Session expired");

            const companyRes = await fetch(GRAPHQL_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({
                    query: UPDATE_COMPANY_MUTATION,
                    variables: {
                        client_id: userId,
                        company_name: formData.companyName,
                        industry: formData.industry
                    }
                })
            });

            const companyResult = await companyRes.json();
            if (companyResult.errors) throw new Error(companyResult.errors[0].message);

            setMessage({ type: 'success', text: "Company details updated!" });
        } catch (error: any) {
            console.error("Save company error:", error);
            setMessage({ type: 'error', text: error.message || "Failed to update company info" });
        } finally {
            setSavingCompany(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto font-['Inter',Helvetica] h-full overflow-y-auto">

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[#131920]">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your profile and company preferences</p>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col items-center mb-10">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-[3px] border-white shadow-md overflow-hidden ring-1 ring-gray-100">
                        {formData.avatar ? (
                            <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-3xl font-semibold text-gray-400">
                                {formData.fullname?.charAt(0) || formData.username?.charAt(0) || "U"}
                            </span>
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center border-[3px] border-white shadow-sm transition-transform hover:scale-110">
                        <Camera className="w-3.5 h-3.5 text-white" />
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />
                <div className="mt-3 text-center">
                    <h2 className="font-semibold text-[#131920] text-lg">{formData.fullname || "User"}</h2>
                    <p className="text-sm text-gray-500">@{formData.username || "username"}</p>
                </div>
            </div>

            <div className="grid gap-8">

                {/* User Info Card */}
                <div className="bg-white p-8 rounded-2xl border border-[#efeff0] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-semibold text-[#131920] flex items-center gap-2">
                            <User className="w-4 h-4 text-[#2563EB]" />
                            Personal Information
                        </h3>
                        <Button
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-9 px-4 text-xs font-semibold rounded-lg shadow-sm"
                            onClick={handleSavePersonal}
                            disabled={savingPersonal}
                        >
                            {savingPersonal ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <Input
                                className="bg-[#fbfcff] border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB] transition-all h-11"
                                placeholder="Enter your full name"
                                value={formData.fullname}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, fullname: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Username</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-gray-400 font-medium select-none">@</span>
                                <Input
                                    className="pl-8 bg-[#fbfcff] border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB] transition-all h-11"
                                    value={formData.username}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Email Address</label>
                            <Input
                                className="bg-[#fbfcff] border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB] transition-all h-11"
                                value={formData.email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                            </div>
                            <Input
                                value={formData.phone}
                                disabled
                                className="bg-gray-50 text-gray-500 border-gray-100 cursor-not-allowed h-11"
                            />
                            <p className="text-[11px] text-gray-400 text-right">Cannot be changed</p>
                        </div>
                    </div>

                    {/* Email Verification Banner - Styled to match */}
                    {formData.email && (
                        <div className="mt-8 bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Verify your email</p>
                                    <p className="text-xs text-gray-500">Please verify {formData.email} to secure your account</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 whitespace-nowrap font-medium h-9">
                                Send Verification
                            </Button>
                        </div>
                    )}
                </div>

                {/* Company Info Card */}
                <div className="bg-white p-8 rounded-2xl border border-[#efeff0] shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-semibold text-[#131920]">Company Details</h3>
                        <Button
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-9 px-4 text-xs font-semibold rounded-lg shadow-sm"
                            onClick={handleSaveCompany}
                            disabled={savingCompany}
                        >
                            {savingCompany ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save Changes"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Company Name</label>
                            <Input
                                className="bg-[#fbfcff] border-gray-200 focus:border-[#2563EB] focus:ring-[#2563EB] transition-all h-11"
                                value={formData.companyName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, companyName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Industry</label>
                            <Select
                                value={formData.industry}
                                onValueChange={(val: string) => setFormData({ ...formData, industry: val })}
                            >
                                <SelectTrigger className="w-full bg-[#fbfcff] border-gray-200 text-gray-900 focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all h-11 px-3">
                                    <SelectValue placeholder="Select industry" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-100 shadow-xl rounded-xl max-h-[240px] z-50">
                                    {industries.length > 0 ? (
                                        industries.map((ind, idx) => (
                                            <SelectItem
                                                key={idx}
                                                value={ind.name}
                                                className="cursor-pointer py-2.5 px-3 focus:bg-blue-50 focus:text-[#2563EB] data-[state=checked]:text-[#2563EB] data-[state=checked]:bg-blue-50 text-gray-700"
                                            >
                                                {ind.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-3 text-sm text-gray-400 text-center">No industries found</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

            </div>

            {message && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-xl text-white font-medium animate-in slide-in-from-bottom-5 z-50 flex items-center gap-3 ${message.type === 'success' ? 'bg-[#131920]' : 'bg-red-500'}`}>
                    {message.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-400" />}
                    {message.text}
                </div>
            )}

        </div>
    );
};
