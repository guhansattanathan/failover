from django.db import migrations


def install(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("""
    CREATE FUNCTION failover_guard_version() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Challenge versions are immutable'; END; $$;
    CREATE TRIGGER immutable_challenge_version BEFORE UPDATE ON learning_challengeversion
    FOR EACH ROW EXECUTE FUNCTION failover_guard_version();
    CREATE FUNCTION failover_guard_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.graph IS DISTINCT FROM OLD.graph OR NEW.challenge_version_id IS DISTINCT FROM OLD.challenge_version_id
         OR NEW.evaluator_version IS DISTINCT FROM OLD.evaluator_version OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Submission snapshots are immutable';
      END IF;
      RETURN NEW;
    END; $$;
    CREATE TRIGGER immutable_submission_snapshot BEFORE UPDATE ON learning_submission
    FOR EACH ROW EXECUTE FUNCTION failover_guard_snapshot();
    """)


def uninstall(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("DROP TRIGGER immutable_submission_snapshot ON learning_submission; DROP FUNCTION failover_guard_snapshot(); DROP TRIGGER immutable_challenge_version ON learning_challengeversion; DROP FUNCTION failover_guard_version();")


class Migration(migrations.Migration):
    dependencies = [("learning", "0001_initial")]
    operations = [migrations.RunPython(install, uninstall)]
