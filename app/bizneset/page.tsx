import { redirect } from 'next/navigation';

/** Old separate page — all questions now live on the home page. */
export default function BiznesetRedirect() {
  redirect('/#bizneset');
}
