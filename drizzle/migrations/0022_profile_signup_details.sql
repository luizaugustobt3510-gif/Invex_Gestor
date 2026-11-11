ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS uf text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  _sexo text := NULLIF(trim(_meta->>'sexo'), '');
  _nasc_txt text := NULLIF(trim(_meta->>'data_nascimento'), '');
  _nasc date := NULL;
  _tel text := NULLIF(regexp_replace(COALESCE(_meta->>'telefone', ''), '[^0-9]', '', 'g'), '');
  _cidade text := NULLIF(left(trim(COALESCE(_meta->>'cidade', '')), 80), '');
  _uf text := NULLIF(upper(left(trim(COALESCE(_meta->>'uf', '')), 2)), '');
BEGIN
  IF _sexo IS NOT NULL AND _sexo NOT IN ('masculino','feminino','outro','nao_informar') THEN
    _sexo := NULL;
  END IF;
  IF _nasc_txt ~ '^\d{4}-\d{2}-\d{2}$' THEN
    BEGIN
      _nasc := _nasc_txt::date;
      IF _nasc > current_date OR _nasc < date '1900-01-01' THEN _nasc := NULL; END IF;
    EXCEPTION WHEN others THEN _nasc := NULL;
    END;
  END IF;
  IF _tel IS NOT NULL AND (length(_tel) < 10 OR length(_tel) > 13) THEN _tel := NULL; END IF;
  IF _uf IS NOT NULL AND _uf !~ '^[A-Z]{2}$' THEN _uf := NULL; END IF;

  INSERT INTO public.profiles (user_id, email, nome, sexo, data_nascimento, telefone, cidade, uf)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    _sexo, _nasc, _tel, _cidade, _uf
  );
  RETURN NEW;
END;
$function$;