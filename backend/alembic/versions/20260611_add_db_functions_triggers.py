from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260611_funcs'
down_revision = '8b5618faf5df'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Trigger function: automatyczne ustawianie updated_at przed UPDATE
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.set_updated_at()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                BEGIN
                    NEW.updated_at := NOW();
                EXCEPTION WHEN undefined_column THEN
                    NULL;
                END;
            END IF;
            RETURN NEW;
        END;
        $$;
        """
    )

    # 2) Triggery wywołujące funkcję dla tabel z polem updated_at
    # Tabela GATUNKI ma updated_at
    op.execute('DROP TRIGGER IF EXISTS trg_set_updated_at_gatunki ON "GATUNKI";')
    op.execute(
        """
        CREATE TRIGGER trg_set_updated_at_gatunki
        BEFORE UPDATE ON "GATUNKI"
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
        """
    )

    # Tabela LIMITY_POLOWOWE ma updated_at
    op.execute('DROP TRIGGER IF EXISTS trg_set_updated_at_limity ON "LIMITY_POLOWOWE";')
    op.execute(
        """
        CREATE TRIGGER trg_set_updated_at_limity
        BEFORE UPDATE ON "LIMITY_POLOWOWE"
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
        """
    )

    # 3) procedura do zamykania starych sesji 
    op.execute(
        """
        CREATE OR REPLACE PROCEDURE public.proc_close_stale_sessions(p_days integer)
        LANGUAGE plpgsql
        AS $$
        BEGIN
            -- Ustawia koniec sesji dla sesji, które są otwarte dłużej niż p_days
            UPDATE "SESJE_POLOWU"
            SET koniec_czas = NOW()
            WHERE koniec_czas IS NULL
              AND start_czas < NOW() - (p_days || ' days')::interval;
        END;
        $$;
        """
    )


def downgrade() -> None:
    # usuń procedurę
    op.execute("DROP PROCEDURE IF EXISTS public.proc_close_stale_sessions(integer);")

    # usuń triggery
    op.execute('DROP TRIGGER IF EXISTS trg_set_updated_at_gatunki ON "GATUNKI";')
    op.execute('DROP TRIGGER IF EXISTS trg_set_updated_at_limity ON "LIMITY_POLOWOWE";')

    # usuń funkcję
    op.execute("DROP FUNCTION IF EXISTS public.set_updated_at();")