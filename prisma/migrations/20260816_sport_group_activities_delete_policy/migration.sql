-- Allow crew members to delete sessions they created.
CREATE POLICY sport_group_activities_delete ON sport_group_activities
  FOR DELETE
  USING (
    is_sport_group_member(group_id, auth.uid())
    AND created_by_id = auth.uid()
  );
