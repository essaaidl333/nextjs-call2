
import React from 'react';

import Voice from '@/app/ui/voicecall';
import { auth } from '@/auth';

// import { auth } from '@/auth';
export default async function VoiceCallPage() {
  // const session = await auth();
  //     const useremail = session?.user?.email;
  //     if (!useremail) {
  //       throw new Error('User is not authenticated or email is missing.');
  //     }
  return (
    
    <div className="flex flex-col justify-center items-center min-h-screen pt-16 pb-8">
    {/* <p className="text-center text-lg">مرحبا بك في صفحة الاتصال الصوتي!</p> */}
  
    <Voice username_get1={"useremail"} />
  {/* <Test/> */}
    <p className="text-center text-sm text-gray-500 mt-8">
      © 2024 جميع الحقوق محفوظة
    </p>
  </div>
  );
}