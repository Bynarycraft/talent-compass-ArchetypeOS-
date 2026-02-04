-- Create role enum
CREATE TYPE public.app_role AS ENUM ('candidate', 'learner', 'supervisor', 'admin');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'candidate',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    archetype TEXT,
    supervisor_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roadmaps table
CREATE TABLE public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    archetype TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
    roadmap_id UUID REFERENCES public.roadmaps(id) ON DELETE SET NULL,
    content_url TEXT,
    content_type TEXT CHECK (content_type IN ('video', 'pdf', 'link', 'mixed')) DEFAULT 'mixed',
    duration_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('mcq', 'written', 'coding', 'mixed')) NOT NULL DEFAULT 'mcq',
    time_limit_minutes INTEGER DEFAULT 60,
    max_attempts INTEGER DEFAULT 3,
    passing_score INTEGER DEFAULT 70,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table
CREATE TABLE public.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'submitted', 'passed', 'failed', 'needs_review')) DEFAULT 'pending',
    answers JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,
    graded_by UUID REFERENCES auth.users(id),
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    status TEXT CHECK (status IN ('enrolled', 'in_progress', 'completed')) DEFAULT 'enrolled',
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, course_id)
);

-- Create learning_sessions table
CREATE TABLE public.learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reflections table
CREATE TABLE public.reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'challenging', 'difficult')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feedback table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skills table
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'supervisor' THEN 2 
      WHEN 'learner' THEN 3 
      WHEN 'candidate' THEN 4 
    END
  LIMIT 1
$$;

-- Function to check if user is supervisor of another user
CREATE OR REPLACE FUNCTION public.is_supervisor_of(_supervisor_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND supervisor_id = _supervisor_id
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Supervisors can view assigned learners" ON public.profiles
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), id));

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for roadmaps (viewable by all authenticated, managed by admin)
CREATE POLICY "Authenticated users can view roadmaps" ON public.roadmaps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roadmaps" ON public.roadmaps
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for courses
CREATE POLICY "Authenticated users can view courses" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tests
CREATE POLICY "Authenticated users can view tests" ON public.tests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tests" ON public.tests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for test_results
CREATE POLICY "Users can view own results" ON public.test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own results" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own in-progress results" ON public.test_results
  FOR UPDATE USING (auth.uid() = user_id AND status IN ('pending', 'in_progress'));

CREATE POLICY "Supervisors can view assigned learner results" ON public.test_results
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), user_id));

CREATE POLICY "Supervisors can grade assigned learner results" ON public.test_results
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'supervisor') 
    AND public.is_supervisor_of(auth.uid(), user_id)
    AND status = 'needs_review'
  );

CREATE POLICY "Admins can manage all results" ON public.test_results
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for course_enrollments
CREATE POLICY "Users can view own enrollments" ON public.course_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own enrollments" ON public.course_enrollments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view assigned learner enrollments" ON public.course_enrollments
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), user_id));

CREATE POLICY "Admins can manage all enrollments" ON public.course_enrollments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for learning_sessions
CREATE POLICY "Users can view own sessions" ON public.learning_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions" ON public.learning_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view assigned learner sessions" ON public.learning_sessions
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), user_id));

CREATE POLICY "Admins can view all sessions" ON public.learning_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reflections
CREATE POLICY "Users can view own reflections" ON public.reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reflections" ON public.reflections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view assigned learner reflections" ON public.reflections
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), user_id));

CREATE POLICY "Admins can view all reflections" ON public.reflections
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for feedback
CREATE POLICY "Users can view feedback they sent or received" ON public.feedback
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all feedback" ON public.feedback
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for skills
CREATE POLICY "Users can view own skills" ON public.skills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own skills" ON public.skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view assigned learner skills" ON public.skills
  FOR SELECT USING (public.is_supervisor_of(auth.uid(), user_id));

CREATE POLICY "Admins can view all skills" ON public.skills
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile and assign candidate role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidate');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to promote candidate to learner
CREATE OR REPLACE FUNCTION public.promote_to_learner(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove candidate role
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'candidate';
  -- Add learner role
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'learner')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmaps_updated_at BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for course content
INSERT INTO storage.buckets (id, name, public) VALUES ('course-content', 'course-content', true);

-- Storage policies for course content
CREATE POLICY "Public can view course content" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-content');

CREATE POLICY "Admins can upload course content" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-content' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course content" ON storage.objects
  FOR UPDATE USING (bucket_id = 'course-content' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course content" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-content' AND public.has_role(auth.uid(), 'admin'));