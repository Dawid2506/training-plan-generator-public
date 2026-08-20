import React from "react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="absolute h-screen w-screen bg-[#000000] bg-[radial-gradient(#ffffff33_1px,#00091d_1px)] bg-[size:20px_20px] flex items-center justify-center">
      <div className="bg-red-200 h-3/4 w-3/5 text-white rounded-2xl flex flex-row overflow-hidden">
        <div className="w-1/2 h-full bg-slate-950 flex items-center justify-center relative">
          <div className="w-4/5 h-full">{children}</div>
        </div>

        <div className="w-1/2 h-full">
          <img
            className="object-bottom object-cover w-full h-full"
            src="/images/adventure-begins.avif"
            alt="Image"
          />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
