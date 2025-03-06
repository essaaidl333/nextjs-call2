'use client';
import { sing_gogel } from './actions';
export default function LoginForm() {
 
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="mt-6 text-center text-gray-500">تسجيل الدخول باستخدام Google</div>
      <form action={sing_gogel} className="mt-3 flex justify-center">
        <button
          type="submit"
          className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg shadow-md"
        >
          <img
            src="/google.jpg"
            alt="Google"
            className="h-6 w-6"
          />
          <span>Google</span>
        </button>
      </form>
    </div>
  );
}
