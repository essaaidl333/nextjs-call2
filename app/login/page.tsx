
import LoginForm from '@/app/ui/login-form';


export default async function LoginPage() {
 
  // console.log(hashedPassword);

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6">
      <div className="flex flex-col items-center justify-center mb-6">
  <div className="h-30 w-96 flex items-center justify-center bg-blue-400 rounded-2xl shadow-lg">
     

  </div>
 
</div>

        <LoginForm />
      </div>
    </main>
  );
}
