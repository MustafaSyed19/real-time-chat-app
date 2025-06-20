import { useNavigate, Link} from "react-router";
import { useAuth } from "../context/authContext";
import {useState} from 'react';

const Register = () => {
  const {register} = useAuth();
  const [email,setEmail] = useState(""); 
  const [password,setPassword] = useState(''); 
  const [confirm, setConfirm ] =useState('');
  const [username,setUsername] = useState(''); 
  const navigate = useNavigate(); 

  const registerHandler = async (event: React.FormEvent) => 
  { 
    event.preventDefault();
    try
    { 
        if(password === confirm)
        { 
            await register(email,password,username); 
            navigate('/home');
        }
        else
        { 
        }
    }
    catch(error)
    { 
        console.log("unable to complete registration")
    }
  }


  return (
    <>
    <div className="flex items-center justify-center h-1/2 b-gray-100 font-sans text-lg">
        <form
          action=""
          className="flex flex-col gap-4 p-4 bg-white rounded shadow-md w-full max-w-sm"
        onSubmit={registerHandler}
        >
            <div className="flex flex-row">
                <Link to="/login">
                    <span className="material-symbols-outlined pr-20"
                    style={{fontSize:"40px"}}>arrow_back</span>
                </Link>
                          <h1 className="self-center text-2xl">Register</h1>
            </div>
          <div className="pb-2 flex-col">
            <label htmlFor="" className="block pb-2">
              Email:{" "}
            </label>
            <input
              type="text"
              name=""
              id=""
              className="w-full shadow-md h-12 border-gray-100 border-1 rounded p-2"
              onChange={(e)=> setEmail(e.target.value)}
              required
            />
          </div>
          <div className="pb-2">
            <label htmlFor="" className="block pb-2">
              Username:{" "}
            </label>
            <input
              type="text"
              name=""
              id=""
              className="w-full shadow-md h-12 border-gray-100 border-1 rounded p-2"
            onChange={(e)=> setUsername(e.target.value)}
            required
            />
          </div>
          <div className="pb-2">
            <label htmlFor="" className="block pb-2">
              Password:{" "}
            </label>
            <input
              type="password"
              name=""
              id=""
              className="w-full shadow-md h-12 border-gray-100 border-1 rounded p-2"
              onChange={(e)=> setPassword(e.target.value)}
              required
            />
          </div>
          <div className="pb-2">
            <label htmlFor="" className="block pb-2">
              Confirm password:{" "}
            </label>
            <input
              type="password"
              name=""
              id=""
              className="w-full shadow-md h-12 border-gray-100 border-1 rounded p-2"
              onChange={(e)=> setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white rounded w-1/2 h-14 self-center hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </form>
      </div>
    </>
  );
};
export default Register;
