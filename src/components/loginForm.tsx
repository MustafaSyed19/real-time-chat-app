import {Link, useNavigate } from "react-router";
import { useAuth } from "../context/authContext"
import {useState} from 'react';

 const LoginForm = ()=> 
{ 
    const {login}  = useAuth();
    const navigate = useNavigate();
    const [email,setEmail] = useState(""); 
    const [password,setPassword] = useState("");

    const frontEndLogin = async(event: React.FormEvent) => 
    { 
        event.preventDefault();
        try
        { 
            await login(email,password); 
            navigate('/home');
        }
        catch(error)
        { 
        }
    }

    return (
    <>
    <div className="flex items-center justify-center h-screen b-gray-100 font-sans">
        <form action="" onSubmit={frontEndLogin} className="flex flex-col items-center gap-4 p-4 bg-white rounded shadow-md w-full max-w-sm">
            <div className="w-full">
                <label htmlFor="" className="block mb-1 font-semibold">Email:</label>
                <input type="text" required name="" className="w-full p-2 border border-gray-300 rounded" onChange={(e)=>setEmail(e.target.value)}/>
            </div>
            <div className="w-full">
                <label htmlFor="" className="block mb-1 font-semibold">Password</label>
                <input type="password" required name="" className="w-full p-2 border border-gray-300 rounded" onChange={(e)=>setPassword(e.target.value)}/>
            </div>
            
            <div>
                <button type="submit" className="mt-3 w-50 h-10 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition">Submit</button>
                <div className="text-sm text-center"> Don't have an account? <br/>
                    <Link to="/register" className="text-blue-500 hover:underline">Register here</Link></div>
            </div>
        </form>
    </div>

    
    </>
    );
}
export default LoginForm;