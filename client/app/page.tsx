"use client"
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const {data , isPending , } = authClient.useSession();
  const router = useRouter();
  if(isPending){
    return (
      <div className="flex flex-col items-center justify-center h-screen">
          <Spinner />
      </div>
    )
  }

  if(!data?.session && !data?.user){
    router.push("/sign-in")
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {/* Make me a signout button */}
      <div className="flex flex-col items-center justify-center"> 
        <img
          src={data?.user?.image || "/vercel.svg"}
          alt="Next.js Logo"
          width={180}
          height={180}
       
        />
        <h1 className="text-3xl font-bold">Welcome {data?.user?.name}</h1>
        <h2 className="text-2xl font-bold">Your email is {data?.user?.email}</h2>
        <Button variant={"destructive"} onClick={()=>authClient.signOut({
          fetchOptions:{
            onError:(ctx)=>console.log(ctx),
            onSuccess:()=>router.push("/sign-in"),
            
          }
        })}>Sign out</Button>
      </div>
    </div>
  );
}
